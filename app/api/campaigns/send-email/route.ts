import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { campaign_id?: string; subject?: string; body?: string };

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

    // Fetch unique emails from successful transactions
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("email")
      .eq("campaign_id", campaignId)
      .eq("status", "success")
      .not("email", "is", null);

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    const emails = [...new Set((txRows ?? []).map((r: { email?: string }) => (r.email ?? "").trim().toLowerCase()).filter(Boolean))];
    if (emails.length === 0) {
      return NextResponse.json({ error: "No recipients found. This campaign has no successful transactions with email addresses." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <onboarding@resend.dev>";
    if (!resendApiKey) return NextResponse.json({ error: "Email service not configured" }, { status: 503 });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.5rem;">${(campaign as { title?: string }).title ?? "Campaign"}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; white-space: pre-wrap;">${emailBody.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
  <p style="color: #666; font-size: 11px; margin-top: 24px;">Sent via Fusion Xpress · CMF Agency</p>
</body>
</html>`;

    let sent = 0;
    const errors: string[] = [];

    for (const to of emails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromEmail, to, subject, html }),
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
