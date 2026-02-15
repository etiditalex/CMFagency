import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Sends the receipt email to the customer (voter/ticket buyer) with
 * vote/ticket number, holder name, and amount. Uses Resend (Vercel env).
 * Called when customer lands on success page - ensures they get the receipt
 * even if webhook Resend isn't configured in Supabase.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <noreply@resend.dev>";

  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  if (!resendKey)
    return NextResponse.json({ error: "Email not configured" }, { status: 503 });

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id,reference,email,payer_name,amount,currency,quantity,campaign_type,metadata")
    .eq("reference", ref)
    .eq("status", "success")
    .maybeSingle();

  if (error || !tx) return NextResponse.json({ error: "Not found or not successful" }, { status: 404 });

  const toEmail = (tx as { email?: string }).email?.trim?.();
  if (!toEmail) return NextResponse.json({ error: "No email" }, { status: 400 });

  const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" && (tx as { metadata?: Record<string, unknown> }).metadata) || {};
  const holderName = (tx as { payer_name?: string }).payer_name?.trim?.() || toEmail;
  const ticketSuffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const slug = (meta.slug as string) || "event";
  const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = (tx as { campaign_type?: string }).campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = (meta.campaign_title as string) || slug;
  const typeLabel = (tx as { campaign_type?: string }).campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.4rem;">${String(campaignTitle).replace(/</g, "&lt;")}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Payment confirmed</p>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 12px 12px;">
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel} number:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${ticketNumber}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel === "Order" ? "Customer" : typeLabel} holder:</td><td style="padding: 8px 0; font-weight: bold;">${String(holderName).replace(/</g, "&lt;")}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Amount paid:</td><td style="padding: 8px 0; font-weight: bold;">${String((tx as { currency?: string }).currency || "KES").toUpperCase()} ${Number((tx as { amount?: number }).amount || 0).toLocaleString()}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${(tx as { quantity?: number }).quantity} ${(tx as { campaign_type?: string }).campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets"}</td></tr>
    </table>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">Reference: <code>${ref}</code></p>
  </div>
  <p style="color: #888; font-size: 11px; margin-top: 20px;">Sent by CMF Agency · Changer Fusions</p>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as { message?: string }).message ?? "Email failed" }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
