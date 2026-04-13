import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  first_name?: string;
  second_name?: string;
  contact?: string;
  email?: string;
  experience?: string;
};

function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0")) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9) return `254${phoneRaw}`;
  return phoneRaw;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const firstName = String(body.first_name ?? "").trim();
    const secondName = String(body.second_name ?? "").trim();
    const contactRaw = String(body.contact ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const experience = String(body.experience ?? "").trim();
    const phone = normalizeKenyaPhone(contactRaw);

    if (!firstName || !secondName || !contactRaw || !email || !experience) {
      return NextResponse.json({ error: "Please fill in all required fields first." }, { status: 400 });
    }
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 0712345678)." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    let oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    if (!oauthUrl.includes("grant_type=")) {
      oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
    }
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json({ error: "M-Pesa credentials are not configured." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: inserted, error: insertErr } = await admin
      .from("kcm_memberships")
      .insert({
        first_name: firstName,
        second_name: secondName,
        contact: contactRaw,
        email,
        experience,
        top_model_interest: false,
        payment_amount_kes: 50,
        payment_confirmed: false,
        payment_status: "pending",
        status: "in_review",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message ?? "Could not create membership." }, { status: 500 });
    }

    const membershipId = String((inserted as { id: string }).id);

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, { headers: { Authorization: `Basic ${auth}` } });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json({ error: tokenJson.error ?? "Failed to get M-Pesa OAuth token." }, { status: 502 });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
    const callbackBase = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? ""}`.replace(/\/$/, "");
    const callbackUrl = `${callbackBase || "https://cmfagency.co.ke"}/api/kcm-membership/daraja-callback`;

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: 50,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: membershipId.slice(0, 12),
        TransactionDesc: "KCM Membership",
      }),
    });

    const stkJson = (await stkRes.json().catch(() => ({}))) as {
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok || !stkJson.CheckoutRequestID) {
      await admin
        .from("kcm_memberships")
        .update({
          payment_status: "failed",
          review_notes: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK push failed",
        })
        .eq("id", membershipId);
      return NextResponse.json({ error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK Push failed" }, { status: 502 });
    }

    await admin
      .from("kcm_memberships")
      .update({
        daraja_checkout_request_id: stkJson.CheckoutRequestID,
        daraja_merchant_request_id: stkJson.MerchantRequestID ?? null,
      })
      .eq("id", membershipId);

    return NextResponse.json({
      membership_id: membershipId,
      checkout_request_id: stkJson.CheckoutRequestID,
      message: "Payment prompt sent. Complete payment on your phone.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
