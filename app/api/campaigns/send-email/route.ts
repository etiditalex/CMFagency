import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";
import { buildAdminEmailHtml, DEFAULT_LOGO_URL, CHANGER_LOGO_CID } from "@/lib/admin-email-template";

const RESEND_RATE_LIMIT_MS = 550;
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BASE64_MB = 4;

type Body = {
  campaign_id?: string;
  subject?: string;
  body?: string;
  image_url?: string;
  /** e.g. "We've discovered new events for you!" */
  greeting_subtext?: string;
  /** e.g. "Events specially curated for you ✨" */
  section_heading?: string;
  section_link_label?: string;
  section_link_url?: string;
  attachments?: { filename: string; content: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Must be portal member with email feature
    const { data: pm } = await supabase.from("portal_members").select("role,features").eq("user_id", user.id).maybeSingle();
    const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    const isPortal = !!pm || !!au;
    const isAdmin = !!pm && (pm.role === "admin" || pm.role === "manager") || !!au;
    const hasEmail = isAdmin || (Array.isArray((pm as any)?.features) && (pm as any).features.includes("email"));

    if (!isPortal || !hasEmail) {
      return NextResponse.json({ error: "Email feature not available" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const campaignId = (body.campaign_id ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const emailBody = (body.body ?? "").trim();
    const imageUrl = (body.image_url ?? "").trim();
    const greetingSubtext = (body.greeting_subtext ?? "").trim();
    const sectionHeading = (body.section_heading ?? "").trim();
    const sectionLinkLabel = (body.section_link_label ?? "").trim();
    const sectionLinkUrl = (body.section_link_url ?? "").trim();
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!campaignId) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "Subject required" }, { status: 400 });
    if (!emailBody) return NextResponse.json({ error: "Message body required" }, { status: 400 });

    // Load campaign and verify access (RLS will enforce)
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id,title,created_by")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!isAdmin && (campaign as { created_by?: string }).created_by !== user.id) {
      return NextResponse.json({ error: "Access denied to this campaign" }, { status: 403 });
    }

    // Fetch emails and payer_name for personalization
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("email, payer_name")
      .eq("campaign_id", campaignId)
      .eq("status", "success")
      .not("email", "is", null);

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    const emailSet = new Set<string>();
    const emailToName = new Map<string, string>();
    for (const r of txRows ?? []) {
      const email = (r as { email?: string }).email ?? "";
      const normalized = email.trim().toLowerCase();
      if (!normalized) continue;
      emailSet.add(normalized);
      const name = (r as { payer_name?: string }).payer_name?.trim();
      if (name && !emailToName.has(normalized)) emailToName.set(normalized, name);
    }
    const emails = [...emailSet];
    if (emails.length === 0) {
      return NextResponse.json({ error: "No recipients found. This campaign has no successful transactions with email addresses." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return NextResponse.json({ error: "Email service not configured" }, { status: 503 });

    const validImageUrl = imageUrl.startsWith("https://") ? imageUrl : "";
    const bodyHtml = emailBody.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

    const userAttachments = rawAttachments
      .slice(0, MAX_ATTACHMENTS)
      .filter((a) => a?.filename && typeof a.content === "string" && a.content.length > 0 && a.content.length <= MAX_ATTACHMENT_BASE64_MB * 1024 * 1024 * (4 / 3))
      .map((a) => ({ filename: String(a.filename).replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment", content: a.content }));

    const logoAttachment = { path: DEFAULT_LOGO_URL, filename: "changer-logo.png", content_id: CHANGER_LOGO_CID } as const;
    const attachments = [logoAttachment, ...userAttachments];

    const getHtmlForRecipient = (recipientEmail: string): string => {
      const name = emailToName.get(recipientEmail) ?? "";
      const greeting = name ? `Hello ${name}` : "Hello";
      return buildAdminEmailHtml({
        brandName: "CMF Agency",
        logoContentId: CHANGER_LOGO_CID,
        greeting,
        greetingSubtext: greetingSubtext || `Updates for ${(campaign as { title?: string }).title ?? "this campaign"}`,
        bannerImageUrl: validImageUrl || undefined,
        bodyHtml,
        sectionHeading: sectionHeading || undefined,
        sectionLinkLabel: sectionLinkLabel || undefined,
        sectionLinkUrl: sectionLinkUrl || undefined,
      });
    };

    const payload: Record<string, unknown> = { from: fromEmail, to: "", subject, attachments };

    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i++) {
      const to = emails[i];
      const html = getHtmlForRecipient(to);
      if (i > 0) await new Promise((r) => setTimeout(r, RESEND_RATE_LIMIT_MS));
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, to, html }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          errors.push(`${to}: ${(data as { message?: string }).message ?? res.status}`);
          continue;
        }
        sent++;
      } catch (e: any) {
        errors.push(`${to}: ${e?.message ?? "Unknown"}`);
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      total: emails.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to send" }, { status: 500 });
  }
}
