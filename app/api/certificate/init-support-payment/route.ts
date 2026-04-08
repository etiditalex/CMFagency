import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureCertificateSupportCampaign } from "@/lib/ensure-cfma-campaigns";

/**
 * Optional 200 KES support payment when requesting certificate of participation.
 * Body: { email }. Returns Paystack authorization_url to complete payment.
 * Payment is optional; certificate can still be downloaded without paying.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }
  if (!paystackSecret) {
    return NextResponse.json({ error: "Payment is not configured." }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const campaign = await ensureCertificateSupportCampaign(supabaseAdmin);
  if (!campaign) {
    return NextResponse.json(
      { error: "Certificate support payment is not available. Please try again later." },
      { status: 503 }
    );
  }

  const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;
  const amount = 200;
  const q = 1;

  const insertPayload = {
    campaign_id: campaign.id,
    campaign_type: "ticket" as const,
    reference,
    provider: "paystack",
    email,
    quantity: q,
    currency: campaign.currency,
    unit_amount: campaign.unit_amount,
    amount,
    status: "pending",
    metadata: {
      slug: campaign.slug,
      campaign_title: campaign.title,
      certificate_support: true,
      paystack_amount_subunit: amount * 100,
    },
  };

  const { error: insertErr } = await supabaseAdmin
    .from("transactions")
    .insert(insertPayload as Record<string, unknown>);

  if (insertErr) {
    return NextResponse.json(
      { error: "Unable to create payment. Please try again." },
      { status: 400 }
    );
  }

  const amountInSubunit = amount * 100;
  const origin = req.headers.get("origin") ?? "";
  const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  const callback_url = `${callbackBase}/events/register-as-model?ref=${reference}&cert_support=1`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInSubunit,
      currency: campaign.currency,
      reference,
      callback_url,
      channels: ["card", "mobile_money"],
      metadata: {
        campaign_id: campaign.id,
        campaign_type: "ticket",
        quantity: q,
        slug: campaign.slug,
        certificate_support: true,
      },
    }),
  });

  const paystackJson = (await paystackRes.json()) as { status?: boolean; data?: { authorization_url?: string }; message?: string };

  if (!paystackRes.ok || !paystackJson?.status) {
    return NextResponse.json(
      { error: paystackJson?.message ?? "Payment initialization failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    authorization_url: paystackJson.data?.authorization_url as string,
    reference,
    amount: 200,
    currency: "KES",
  });
}
