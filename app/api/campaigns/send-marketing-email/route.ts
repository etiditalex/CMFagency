import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";
import { buildAdminEmailHtml, DEFAULT_LOGO_URL, CHANGER_LOGO_CID } from "@/lib/admin-email-template";

const RESEND_RATE_LIMIT_MS = 550;
const MAX_RECIPIENTS = 500;
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BASE64_MB = 4;

type Body = {
  emails?: string[] | string;
  subject?: string;
  body?: string;
  title?: string;
  image_url?: string;
  greeting_subtext?: string;
  section_heading?: string;
  section_link_label?: string;
  section_link_url?: string;
  attachments?: { filename: string; content: string }[];
};

function parseEmails(input: string[] | string): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((s) =>
      String(s)
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    );
  }
  return String(input ?? "")
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

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

    const { data: pm } = await supabase.from("portal_members").select("role,features").eq("user_id", user.id).maybeSingle();
    const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    const isPortal = !!pm || !!au;
    const isAdmin = !!pm && (pm.role === "admin" || pm.role === "manager") || !!au;
    const hasEmail = isAdmin || (Array.isArray((pm as any)?.features) && (pm as any).features.includes("email"));

    if (!isPortal || !hasEmail) {
      return NextResponse.json({ error: "Email feature not available" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const rawEmails = body.emails;
    const subject = (body.subject ?? "").trim();
    const emailBody = (body.body ?? "").trim();
    const title = (body.title ?? "").trim() || "CMF Agency";
    const imageUrl = (body.image_url ?? "").trim();
    const greetingSubtext = (body.greeting_subtext ?? "").trim();
    const sectionHeading = (body.section_heading ?? "").trim();
    const sectionLinkLabel = (body.section_link_label ?? "").trim();
    const sectionLinkUrl = (body.section_link_url ?? "").trim();
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

    const emails = [...new Set(parseEmails(rawEmails ?? []))];
    if (emails.length === 0) {
      return NextResponse.json({ error: "Add at least one valid email address (comma or newline separated)." }, { status: 400 });
    }
    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Maximum ${MAX_RECIPIENTS} recipients per send. You have ${emails.length}.` }, { status: 400 });
    }
    if (!subject) return NextResponse.json({ error: "Subject required" }, { status: 400 });
    if (!emailBody) return NextResponse.json({ error: "Message body required" }, { status: 400 });

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

    const html = buildAdminEmailHtml({
      brandName: title,
      logoContentId: CHANGER_LOGO_CID,
      greeting: "Hello",
      greetingSubtext: greetingSubtext || "Here’s something we thought you’d like.",
      bannerImageUrl: validImageUrl || undefined,
      bodyHtml,
      sectionHeading: sectionHeading || undefined,
      sectionLinkLabel: sectionLinkLabel || undefined,
      sectionLinkUrl: sectionLinkUrl || undefined,
    });

    const payload: Record<string, unknown> = { from: fromEmail, to: "", subject, html, attachments };

    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i++) {
      const to = emails[i];
      if (i > 0) await new Promise((r) => setTimeout(r, RESEND_RATE_LIMIT_MS));
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, to }),
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
