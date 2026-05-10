import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKcmRegistrationFeeKes } from "@/lib/kcm-registration-fee";

const FASHION_CATEGORIES = new Set(["model", "event_organizer", "designer", "other"]);

type Body = {
  first_name?: string;
  second_name?: string;
  contact?: string;
  email?: string;
  experience?: string;
  fashion_category?: string;
  fashion_category_other?: string;
};

function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0")) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9) return `254${phoneRaw}`;
  return phoneRaw;
}

/** International format: 254 + 9 digits (all Kenyan mobile ranges). */
function isValidKeMsisdn(phone254: string): boolean {
  return /^254\d{9}$/.test(phone254);
}

function resolveStkTransactionType(): "CustomerPayBillOnline" | "CustomerBuyGoodsOnline" {
  const raw = (process.env.MPESA_STK_TRANSACTION_TYPE ?? "").trim();
  if (raw === "CustomerBuyGoodsOnline") return "CustomerBuyGoodsOnline";
  return "CustomerPayBillOnline";
}

type StkPushJson = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string | number;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
  requestId?: string;
  errorCode?: string;
  fault?: { faultstring?: string; detail?: { ErrorCode?: string; ErrorMessage?: string } };
};

function describeStkFailure(stkJson: StkPushJson, httpStatus: number): string {
  const fault = stkJson.fault?.faultstring;
  const detailMsg = stkJson.fault?.detail?.ErrorMessage;
  return (
    stkJson.ResponseDescription ??
    stkJson.CustomerMessage ??
    stkJson.errorMessage ??
    detailMsg ??
    fault ??
    (stkJson.errorCode ? String(stkJson.errorCode) : null) ??
    `M-Pesa STK request failed (HTTP ${httpStatus}). Check Daraja credentials and callback URL (NEXT_PUBLIC_SITE_URL).`
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const firstName = String(body.first_name ?? "").trim();
    const secondName = String(body.second_name ?? "").trim();
    const contactRaw = String(body.contact ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const experience = String(body.experience ?? "").trim();
    const fashionCategory = String(body.fashion_category ?? "").trim().toLowerCase();
    const fashionOtherRaw = String(body.fashion_category_other ?? "").trim();
    const phone = normalizeKenyaPhone(contactRaw);

    if (!firstName || !secondName || !contactRaw || !email || !experience) {
      return NextResponse.json({ error: "Please fill in all required fields first." }, { status: 400 });
    }
    if (!FASHION_CATEGORIES.has(fashionCategory)) {
      return NextResponse.json({ error: "Please select a fashion category." }, { status: 400 });
    }
    if (fashionCategory === "other" && !fashionOtherRaw) {
      return NextResponse.json(
        { error: "Please describe your category when you select Other." },
        { status: 400 }
      );
    }
    if (fashionOtherRaw.length > 500) {
      return NextResponse.json({ error: "Category description is too long (max 500 characters)." }, { status: 400 });
    }
    if (!isValidKeMsisdn(phone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenya M-Pesa number (e.g. 0712345678 or +254712345678)." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCodeRaw = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    let oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    if (!oauthUrl.includes("grant_type=")) {
      oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
    }
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCodeRaw || !passKey) {
      return NextResponse.json({ error: "M-Pesa credentials are not configured." }, { status: 500 });
    }

    const businessShortCode = Number.parseInt(String(shortCodeRaw).trim(), 10);
    if (!Number.isFinite(businessShortCode) || businessShortCode <= 0) {
      return NextResponse.json({ error: "MPESA_SHORTCODE must be a valid numeric business short code." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const amountKesRaw = await getKcmRegistrationFeeKes(admin);
    const amountKes = Math.max(1, Math.round(Number(amountKesRaw)));
    if (!Number.isFinite(amountKes)) {
      return NextResponse.json({ error: "Invalid registration fee configuration." }, { status: 500 });
    }

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, { headers: { Authorization: `Basic ${authHeader}` } });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      const hint =
        tokenJson.error_description ?? tokenJson.error ?? `OAuth HTTP ${tokenRes.status}`;
      return NextResponse.json({ error: `M-Pesa auth failed: ${hint}` }, { status: 502 });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("kcm_memberships")
      .insert({
        first_name: firstName,
        second_name: secondName,
        contact: contactRaw,
        email,
        experience,
        fashion_category: fashionCategory,
        fashion_category_other: fashionCategory === "other" ? fashionOtherRaw : null,
        top_model_interest: false,
        payment_amount_kes: amountKes,
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

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const password = Buffer.from(`${businessShortCode}${passKey}${timestamp}`).toString("base64");
    const callbackBase = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? ""}`.replace(/\/$/, "");
    const callbackUrl = `${callbackBase || "https://cmfagency.co.ke"}/api/kcm-membership/daraja-callback`;

    const transactionType = resolveStkTransactionType();

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amountKes,
        PartyA: phone,
        PartyB: businessShortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: membershipId.replace(/-/g, "").slice(0, 12),
        // Daraja commonly limits this field to 13 characters for STK Push.
        TransactionDesc: "KCM Register",
      }),
    });

    const stkJson = (await stkRes.json().catch(() => ({}))) as StkPushJson;

    const responseCode = String(stkJson.ResponseCode ?? "").trim();
    const checkoutId = stkJson.CheckoutRequestID;
    const acceptedByCode = !responseCode || responseCode === "0";

    if (!stkRes.ok) {
      await admin
        .from("kcm_memberships")
        .update({
          payment_status: "failed",
          review_notes: describeStkFailure(stkJson, stkRes.status).slice(0, 2000),
        })
        .eq("id", membershipId);
      return NextResponse.json(
        { error: describeStkFailure(stkJson, stkRes.status) },
        { status: 502 }
      );
    }

    if (!acceptedByCode || !checkoutId) {
      const reason = describeStkFailure(stkJson, stkRes.status);
      await admin
        .from("kcm_memberships")
        .update({
          payment_status: "failed",
          review_notes: reason.slice(0, 2000),
        })
        .eq("id", membershipId);
      return NextResponse.json(
        {
          error:
            reason ||
            (responseCode
              ? `M-Pesa declined STK push (code ${responseCode}). Use Paybill flow or set MPESA_STK_TRANSACTION_TYPE=CustomerBuyGoodsOnline if this short code is a Till.`
              : "M-Pesa did not return a checkout ID. Verify MPESA_SHORTCODE, passkey, and sandbox test phone numbers."),
        },
        { status: 502 }
      );
    }

    await admin
      .from("kcm_memberships")
      .update({
        daraja_checkout_request_id: checkoutId,
        daraja_merchant_request_id: stkJson.MerchantRequestID ?? null,
      })
      .eq("id", membershipId);

    return NextResponse.json({
      membership_id: membershipId,
      checkout_request_id: checkoutId,
      message: "Payment prompt sent. Complete payment on your phone.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
