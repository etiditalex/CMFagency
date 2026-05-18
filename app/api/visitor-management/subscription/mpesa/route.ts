import { NextRequest, NextResponse } from "next/server";

import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import {
  createVisitorSubscriptionPayment,
  parseSubscriptionPaymentBody,
} from "@/lib/visitors/create-subscription-payment";

export const dynamic = "force-dynamic";

function normalizeKenyaPhone(phoneRaw: string): string {
  const phone = phoneRaw.trim().replace(/\s/g, "");
  if (phone.startsWith("+254")) return `254${phone.slice(4)}`;
  if (phone.startsWith("254")) return phone;
  if (phone.startsWith("0")) return `254${phone.slice(1)}`;
  if (phone.length === 9) return `254${phone}`;
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    if (isAdmin) {
      return NextResponse.json({ error: "Admins do not purchase visitor subscriptions." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { plan, billingInterval } = parseSubscriptionPaymentBody(body);
    if (!plan) {
      return NextResponse.json({ error: "Choose Basic or Enterprise." }, { status: 400 });
    }

    const phone = normalizeKenyaPhone(String(body.phone ?? ""));
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid M-Pesa number (e.g. 0712345678 or 254712345678)" },
        { status: 400 }
      );
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa/Daraja credentials are not configured on the server." },
        { status: 500 }
      );
    }

    const { data: userRow } = await admin.auth.admin.getUserById(userId);
    const email = String(userRow?.user?.email ?? body.email ?? "").trim();
    const payerName =
      String(userRow?.user?.user_metadata?.name ?? body.payer_name ?? body.payerName ?? "").trim() || null;

    const created = await createVisitorSubscriptionPayment({
      admin,
      ownerId: userId,
      email: email || "visitor@example.com",
      payerName,
      plan,
      billingInterval,
      provider: "daraja",
      phone,
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status ?? 400 });
    }

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${authHeader}` },
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error ?? "Failed to get M-Pesa OAuth token" },
        { status: 502 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
    const callbackBase = `${siteUrl}`.replace(/\/$/, "") || "https://cmfagency.co.ke";
    const callbackUrl = `${callbackBase}/api/daraja/callback`;
    const amount = Math.round(created.amountKes);

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
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: created.reference.slice(0, 12),
        TransactionDesc: "Visitor Mgmt",
      }),
    });

    const stkJson = (await stkRes.json()) as {
      CheckoutRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      await admin.from("transactions").delete().eq("reference", created.reference);
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "M-Pesa STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      await admin.from("transactions").delete().eq("reference", created.reference);
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from Daraja" },
        { status: 502 }
      );
    }

    await admin
      .from("transactions")
      .update({
        metadata: {
          ...created.metadata,
          checkout_request_id: checkoutRequestId,
          phone,
        },
      } as { metadata: Record<string, unknown> })
      .eq("reference", created.reference);

    return NextResponse.json({
      reference: created.reference,
      checkout_request_id: checkoutRequestId,
      amount_kes: amount,
      message: "Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
