import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

type PromptBody = {
  amount_kes?: number;
  phone?: string;
};

type StkPushJson = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string | number;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
  errorCode?: string;
  fault?: { faultstring?: string; detail?: { ErrorMessage?: string } };
};

function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0")) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9) return `254${phoneRaw}`;
  return phoneRaw;
}

function isValidKeMsisdn(phone254: string): boolean {
  return /^254\d{9}$/.test(phone254);
}

function describeFailure(stkJson: StkPushJson, httpStatus: number): string {
  return (
    stkJson.ResponseDescription ??
    stkJson.CustomerMessage ??
    stkJson.errorMessage ??
    stkJson.fault?.detail?.ErrorMessage ??
    stkJson.fault?.faultstring ??
    (stkJson.errorCode ? String(stkJson.errorCode) : null) ??
    `M-Pesa STK request failed (HTTP ${httpStatus}).`
  );
}

function resolveStkTransactionType(): "CustomerPayBillOnline" | "CustomerBuyGoodsOnline" {
  const raw = (process.env.MPESA_STK_TRANSACTION_TYPE ?? "").trim();
  if (raw === "CustomerBuyGoodsOnline") return "CustomerBuyGoodsOnline";
  return "CustomerPayBillOnline";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as PromptBody;
    const amountKes = Math.round(Number(body.amount_kes ?? 0));
    if (!Number.isFinite(amountKes) || amountKes < 1 || amountKes > 500000) {
      return NextResponse.json({ error: "Enter a valid amount between 1 and 500,000." }, { status: 400 });
    }

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: memberRow, error: memberErr } = await admin
      .from("kcm_memberships")
      .select("contact")
      .eq("id", session.membershipId)
      .maybeSingle();
    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

    const phoneInput = String(body.phone ?? (memberRow as { contact?: string } | null)?.contact ?? "").trim();
    const phone = normalizeKenyaPhone(phoneInput);
    if (!isValidKeMsisdn(phone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenya M-Pesa number (e.g. 0712345678 or +254712345678)." },
        { status: 400 }
      );
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

    const { data: txRow, error: txInsertErr } = await admin
      .from("kcm_member_wallet_transactions")
      .insert({
        membership_id: session.membershipId,
        amount_kes: amountKes,
        phone,
        status: "pending",
      })
      .select("id")
      .single();
    if (txInsertErr || !txRow) {
      return NextResponse.json({ error: txInsertErr?.message ?? "Could not create wallet transaction." }, { status: 500 });
    }
    const txId = String((txRow as { id: string }).id);

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, { headers: { Authorization: `Basic ${authHeader}` } });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      const failure = tokenJson.error_description ?? tokenJson.error ?? `OAuth HTTP ${tokenRes.status}`;
      await admin
        .from("kcm_member_wallet_transactions")
        .update({ status: "failed", failure_reason: String(failure).slice(0, 1000) })
        .eq("id", txId);
      return NextResponse.json({ error: `M-Pesa auth failed: ${failure}` }, { status: 502 });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const password = Buffer.from(`${businessShortCode}${passKey}${timestamp}`).toString("base64");
    const callbackBase = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? ""}`.replace(/\/$/, "");
    const callbackUrl = `${callbackBase || "https://cmfagency.co.ke"}/api/kcm-member/wallet/daraja-callback`;

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
        TransactionType: resolveStkTransactionType(),
        Amount: amountKes,
        PartyA: phone,
        PartyB: businessShortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: `KCMW${txId.replace(/-/g, "").slice(0, 8)}`,
        TransactionDesc: "KCM Wallet",
      }),
    });

    const stkJson = (await stkRes.json().catch(() => ({}))) as StkPushJson;
    const responseCode = String(stkJson.ResponseCode ?? "").trim();
    const checkoutId = String(stkJson.CheckoutRequestID ?? "").trim();
    const acceptedByCode = !responseCode || responseCode === "0";

    if (!stkRes.ok || !acceptedByCode || !checkoutId) {
      const failure = describeFailure(stkJson, stkRes.status);
      await admin
        .from("kcm_member_wallet_transactions")
        .update({ status: "failed", failure_reason: failure.slice(0, 1000) })
        .eq("id", txId);
      return NextResponse.json({ error: failure }, { status: 502 });
    }

    await admin
      .from("kcm_member_wallet_transactions")
      .update({
        daraja_checkout_request_id: checkoutId,
        daraja_merchant_request_id: stkJson.MerchantRequestID ?? null,
      })
      .eq("id", txId);

    return NextResponse.json({
      transaction_id: txId,
      checkout_request_id: checkoutId,
      message: "Payment prompt sent. Complete payment on your phone.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
