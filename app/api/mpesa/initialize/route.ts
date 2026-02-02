import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type InitBody = {
  slug?: string;
  phone?: string;
  email?: string;
  quantity?: number;
  contestant_id?: string | null;
};

function normalizeMpesaPhone(input: string) {
  const raw = String(input ?? "").trim().replace(/\s+/g, "");
  const digits = raw.replace(/[^\d+]/g, "");

  // Accept: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
  let n = digits;
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = `254${n.slice(1)}`;
  if (n.length === 9 && n.startsWith("7")) n = `254${n}`;

  // Very common M-Pesa customer numbers: 2547XXXXXXXX
  if (!/^2547\d{8}$/.test(n)) return null;
  return n;
}

async function getDarajaAccessToken(baseUrl: string, consumerKey: string, consumerSecret: string) {
  const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });

  const json = (await res.json()) as { access_token?: string; expires_in?: string; error?: string };
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error ?? "Daraja token request failed");
  }
  return json.access_token;
}

function darajaTimestamp(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

type DarajaStkResponse = {
  ResponseCode?: string;
  CustomerMessage?: string;
  errorMessage?: string;
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
};

/**
 * Initializes an M-Pesa Daraja STK Push transaction.
 *
 * Security notes:
 * - This endpoint does NOT mark transactions as successful.
 * - Payment success is ONLY confirmed via the Daraja callback hitting /api/mpesa/callback.
 * - We insert a "pending" transaction first under RLS rules using the anon key.
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - NEXT_PUBLIC_SITE_URL
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_SHORTCODE
 * - MPESA_PASSKEY
 * - MPESA_CALLBACK_TOKEN (shared secret to validate callbacks)
 * Optional:
 * - MPESA_BASE_URL (default: https://api.safaricom.co.ke, use https://sandbox.safaricom.co.ke for sandbox)
 * - MPESA_TRANSACTION_TYPE (default: CustomerPayBillOnline)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitBody;

    const slug = (body.slug ?? "").trim().toLowerCase();
    const email = (body.email ?? "").trim();
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    const contestantId = body.contestant_id ?? null;
    const phone = normalizeMpesaPhone(body.phone ?? "");

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Phone must be a valid Safaricom number (e.g. 07XXXXXXXX)" }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    // Default to Daraja sandbox unless explicitly overridden.
    // Sandbox: https://sandbox.safaricom.co.ke
    // Prod:    https://api.safaricom.co.ke
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackToken = process.env.MPESA_CALLBACK_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const transactionType = process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline";

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackToken || !siteUrl) {
      return NextResponse.json({ error: "M-Pesa server env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", slug)
      .single();

    if (campaignErr) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Daraja STK Push is KES-only in practice for most setups.
    if (String(campaign.currency ?? "").toUpperCase() !== "KES") {
      return NextResponse.json({ error: "This campaign is not payable via M-Pesa (currency must be KES)." }, { status: 400 });
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
      provider: "mpesa",
      email: email || null,
      quantity: q,
      currency: "KES",
      unit_amount: unitAmount,
      amount,
      contestant_id: campaign.type === "vote" ? contestantId : null,
      status: "pending",
      metadata: {
        slug: campaign.slug,
        campaign_title: campaign.title,
        mpesa_phone: phone,
      },
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "Unable to create transaction (RLS rejected or invalid campaign)." },
        { status: 400 }
      );
    }

    const token = await getDarajaAccessToken(baseUrl, consumerKey, consumerSecret);
    const timestamp = darajaTimestamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const callbackUrl = `${siteUrl.replace(/\/$/, "")}/api/mpesa/callback?token=${encodeURIComponent(callbackToken)}`;

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: reference,
        TransactionDesc: `${campaign.title}`.slice(0, 64),
      }),
    });

    const stkJson = (await stkRes.json()) as DarajaStkResponse;
    if (!stkRes.ok || stkJson?.ResponseCode !== "0") {
      return NextResponse.json(
        { error: stkJson?.errorMessage ?? stkJson?.CustomerMessage ?? "M-Pesa STK Push failed" },
        { status: 502 }
      );
    }

    // Store Daraja IDs for callback correlation (best-effort).
    const checkoutRequestId = String(stkJson.CheckoutRequestID ?? "");
    const merchantRequestId = String(stkJson.MerchantRequestID ?? "");
    if (checkoutRequestId) {
      await supabase
        .from("transactions")
        .update({
          metadata: {
            slug: campaign.slug,
            campaign_title: campaign.title,
            mpesa_phone: phone,
            mpesa_checkout_request_id: checkoutRequestId,
            mpesa_merchant_request_id: merchantRequestId || null,
          },
        })
        .eq("reference", reference);
    }

    return NextResponse.json({
      reference,
      checkout_request_id: checkoutRequestId,
      customer_message: stkJson.CustomerMessage ?? "Check your phone to complete the payment.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

