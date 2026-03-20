import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

/**
 * Dashboard admin: approve a contestant to download their participation certificate.
 * On approval, the certificate PDF is generated and sent to the contestant's email.
 * Requires authenticated portal member with access to the contestant's campaign.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing session" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized: invalid or expired session" }, { status: 401 });
  }

  let body: { contestant_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contestantId = body.contestant_id?.trim();
  if (!contestantId) {
    return NextResponse.json({ error: "contestant_id is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify contestant exists and get campaign for RLS check
  const { data: contestant, error: fetchErr } = await supabase
    .from("contestants")
    .select("id,campaign_id")
    .eq("id", contestantId)
    .single();

  if (fetchErr || !contestant) {
    return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
  }

  // Use user's Supabase client so RLS applies (portal member must have access to campaign)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: updated, error: updateErr } = await userClient
    .from("contestants")
    .update({
      certificate_approved_at: new Date().toISOString(),
      certificate_approved_by: user.id,
    })
    .eq("id", contestantId)
    .select("id,certificate_approved_at")
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116" || String(updateErr.message).includes("row-level")) {
      return NextResponse.json(
        { error: "You do not have permission to approve certificates for this contestant." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Fetch contestant name, email and campaign title for certificate and email
  const { data: contestantRow, error: detailErr } = await supabase
    .from("contestants")
    .select("name,email,campaign_id")
    .eq("id", contestantId)
    .single();

  let emailSent = false;
  if (!detailErr && contestantRow) {
    const name = (contestantRow as { name: string }).name ?? "";
    const email = (contestantRow as { email?: string | null }).email?.trim();
    const campaignId = (contestantRow as { campaign_id: string }).campaign_id;

    if (email) {
      const { data: campaignRow } = await supabase
        .from("campaigns")
        .select("title")
        .eq("id", campaignId)
        .single();
      const categoryTitle = (campaignRow as { title?: string } | null)?.title ?? "CMFA";

      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        const pdfBytes = await generateCertificatePdf({
          participantName: name,
          categoryTitle,
          date: dateStr,
        });
        const base64Pdf = Buffer.from(pdfBytes).toString("base64");
        const filename = `CMFA-Certificate-${name.replace(/[^a-zA-Z0-9-_]/g, "-")}.pdf`;

        if (resendApiKey) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: email,
              subject: "Your Certificate of Participation – CMF Agency",
              html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Certificate of participation" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #111; margin-top: 0;">Your certificate is ready</h2>
                  <p>Hi ${name.replace(/</g, "&lt;")},</p>
                  <p>Your participation certificate for <strong>${categoryTitle.replace(/</g, "&lt;")}</strong> has been approved. Please find your e-signed certificate attached to this email.</p>
                  <p>You can download and save the PDF from the attachment below.</p>
                  <p style="margin-top: 32px; color: #666; font-size: 14px;">Thank you for participating.</p>
                  <p style="color: #999; font-size: 12px;">CMF Agency · Changer Fusions</p>
</div>
</body>
</html>
              `,
              attachments: [{ filename, content: base64Pdf }],
            }),
          });
          if (res.ok) {
            emailSent = true;
            // Mark as issued so they cannot download again (one-time only)
            await supabase
              .from("contestants")
              .update({ certificate_downloaded_at: new Date().toISOString() })
              .eq("id", contestantId);
          }
        }
      } catch {
        // Non-fatal: approval succeeded; email may be sent later or contestant can download from site
      }
    }
  }

  return NextResponse.json({
    success: true,
    contestant_id: (updated as { id: string }).id,
    certificate_approved_at: (updated as { certificate_approved_at?: string }).certificate_approved_at,
    email_sent: emailSent,
  });
}
