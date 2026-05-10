import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getServicePackageById } from "@/lib/service-packages-catalog";
import { ensureSeoServiceCampaign } from "@/lib/ensure-service-seo-campaigns";

export const dynamic = "force-dynamic";

type Body = {
  access_token?: string;
  phone?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const accessToken = (body.access_token ?? "").trim();
    const phoneRaw = (body.phone ?? "").trim().replace(/\s/g, "");

    const phone =
      phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
      phoneRaw.startsWith("254") ? phoneRaw :
      phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
      phoneRaw.length === 9 && /^[17]/.test(phoneRaw) ? `254${phoneRaw}` :
      phoneRaw;

    if (!accessToken) return NextResponse.json({ error: "access_token is required" }, { status: 400 });
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 254712345678)" }, { status: 400 });
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
      return NextResponse.json(
        { error: "M-Pesa/Daraja credentials not configured on server." },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("service_invoices")
      .select("id,status,amount_kes,package_slug,customer_email,customer_name")
      .eq("access_token", accessToken)
      .maybeSingle();

    if (invErr || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const inv = invoice as {
      id: string;
      status: string;
      amount_kes: number;
      package_slug: string;
      customer_email: string;
      customer_name: string;
    };

    if (inv.status !== "unpaid") {
      return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
    }

    const pkg = getServicePackageById(inv.package_slug);
    if (!pkg || pkg.amountKes !== inv.amount_kes) {
      return NextResponse.json({ error: "Invoice package mismatch" }, { status: 400 });
    }

    const campaign = await ensureSeoServiceCampaign(supabaseAdmin, pkg.campaignSlug);
    if (!campaign) {
      return NextResponse.json(
        { error: "Could not resolve billing campaign. Ensure an admin user exists in the system." },
        { status: 500 }
      );
    }

    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;
    const amount = Math.round(inv.amount_kes);
    const q = 1;

    const insertPayload = {
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "daraja",
      email: inv.customer_email,
      payer_name: inv.customer_name,
      quantity: q,
      currency: campaign.currency,
      unit_amount: campaign.unit_amount,
      amount,
      discount_amount: 0,
      coupon_id: null,
      contestant_id: null,
      status: "pending",
      metadata: {
        slug: campaign.slug,
        campaign_title: campaign.title,
        phone,
        service_invoice_id: inv.id,
        invoice_access_token: accessToken,
      },
    };

    const { error: insertErr } = await supabaseAdmin.from("transactions").insert(insertPayload as Record<string, unknown>);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message ?? "Could not start M-Pesa payment" }, { status: 400 });
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error_description ?? "Daraja OAuth failed" },
        { status: 502 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const passStr = `${shortCode}${passKey}${timestamp}`;
    const password = Buffer.from(passStr).toString("base64");

    const callbackBase = `${siteUrl}`.replace(/\/$/, "") || "https://cmfagency.co.ke";
    const callbackUrl = `${callbackBase}/api/daraja/callback`;

    const trxTypeRaw = (process.env.MPESA_STK_TRANSACTION_TYPE ?? "").trim();
    const transactionType =
      trxTypeRaw === "CustomerBuyGoodsOnline" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";

    const stkBody = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: `${pkg.title}`.slice(0, 20),
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
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      await supabaseAdmin.from("transactions").delete().eq("reference", reference);
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      await supabaseAdmin.from("transactions").delete().eq("reference", reference);
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from Daraja" },
        { status: 502 }
      );
    }

    await supabaseAdmin
      .from("transactions")
      .update({
        metadata: {
          ...(insertPayload.metadata as Record<string, unknown>),
          checkout_request_id: checkoutRequestId,
        },
      } as Record<string, unknown>)
      .eq("reference", reference);

    return NextResponse.json({
      reference,
      checkout_request_id: checkoutRequestId,
      message: "Check your phone for the M-Pesa prompt.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
