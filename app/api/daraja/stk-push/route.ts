import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type StkPushBody = {
  slug?: string;
  phone?: string;
  email?: string;
  quantity?: number;
  contestant_id?: string | null;
  payer_name?: string | null;
};

/**
 * Initiates M-Pesa STK Push via Daraja API.
 *
 * Flow:
 * 1. Create pending transaction in DB (provider: daraja)
 * 2. Get OAuth token from Safaricom
 * 3. Call Daraja STK Push - user gets prompt on phone
 * 4. Safaricom sends result to /api/daraja/callback
 *
 * Env required:
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_SHORTCODE (Business Short Code)
 * - MPESA_PASSKEY
 * - NEXT_PUBLIC_SITE_URL (for callback)
 *
 * Optional:
 * - MPESA_BASE_URL (default: sandbox)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StkPushBody;

    const slug = (body.slug ?? "").trim().toLowerCase();
    const phoneRaw = (body.phone ?? "").trim().replace(/\s/g, "");
    const email = (body.email ?? "").trim();
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    const contestantId = body.contestant_id ?? null;
    const payerName = (body.payer_name ?? "").trim() || null;

    // Normalize phone: 254XXXXXXXXX (Kenya)
    const phone =
      phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
      phoneRaw.startsWith("254") ? phoneRaw :
      phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
      phoneRaw.length === 9 ? `254${phoneRaw}` :
      phoneRaw;

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 254712345678)" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    // Production: Safaricom may provide custom proxy URLs. Use these if set.
    const oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa/Daraja credentials not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY." },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", slug)
      .single();

    if (campaignErr) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (String(campaign.currency).toUpperCase() !== "KES") {
      return NextResponse.json({ error: "M-Pesa is only available for KES campaigns" }, { status: 400 });
    }

    const q = Math.max(1, Math.min(Number(campaign.max_per_txn), quantity));

    if (campaign.type === "vote") {
      if (!contestantId) return NextResponse.json({ error: "contestant_id is required for voting" }, { status: 400 });
      const { data: contestant, error: contestantErr } = await supabase
        .from("contestants")
        .select("id")
        .eq("id", contestantId)
        .eq("campaign_id", campaign.id)
        .single();
      if (contestantErr || !contestant) {
        return NextResponse.json({ error: "Invalid contestant for this campaign" }, { status: 400 });
      }
    }

    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;
    const unitAmount = Number(campaign.unit_amount);
    const amount = unitAmount * q;

    const { error: insertErr } = await supabase.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "daraja",
      email: email || null,
      payer_name: payerName,
      quantity: q,
      currency: campaign.currency,
      unit_amount: unitAmount,
      amount,
      contestant_id: campaign.type === "vote" ? contestantId : null,
      status: "pending",
      metadata: {
        slug: campaign.slug,
        campaign_title: campaign.title,
        phone,
      },
    });

    if (insertErr) {
      const msg = insertErr?.message ?? "";
      const isRls = /policy|RLS|row level security/i.test(msg) || msg.includes("violates");
      return NextResponse.json(
        { error: isRls ? "Unable to create transaction." : insertErr.message },
        { status: 400 }
      );
    }

    // Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error ?? "Failed to get Daraja OAuth token" },
        { status: 502 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const passStr = `${shortCode}${passKey}${timestamp}`;
    const password = Buffer.from(passStr).toString("base64");

    const callbackBase = `${siteUrl}`.replace(/\/$/, "") || "https://cmfagency.co.ke";
    const callbackUrl = `${callbackBase}/api/daraja/callback`;

    const stkBody = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: `${campaign.title?.slice(0, 20) ?? campaign.slug} (${q} ${campaign.type === "ticket" ? "ticket(s)" : "vote(s)"})`,
    };

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkBody),
    });

    const stkJson = (await stkRes.json()) as {
      ResponseCode?: number;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from Daraja" },
        { status: 502 }
      );
    }

    // Store CheckoutRequestID for callback lookup (service role needed for update)
    const metaUpdate = { slug: campaign.slug, campaign_title: campaign.title, phone, checkout_request_id: checkoutRequestId };
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("transactions")
        .update({ metadata: metaUpdate } as any)
        .eq("reference", reference);
    }

    return NextResponse.json({
      reference,
      checkout_request_id: checkoutRequestId,
      message: "Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
