import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureMerchandiseCampaign } from "@/lib/ensure-cfma-campaigns";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
};

type Body = {
  email?: string;
  payer_name?: string | null;
  phone?: string;
  cart?: CartItem[];
  shipping?: number;
};

const DEFAULT_SHIPPING = 500;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email ?? "").trim();
    const payerName = (body.payer_name ?? "").trim() || null;
    const phoneRaw = (body.phone ?? "").trim().replace(/\s/g, "");
    const cart = Array.isArray(body.cart) ? body.cart : [];
    const shipping = Math.max(0, Math.trunc(Number(body.shipping ?? DEFAULT_SHIPPING)));

    const phone =
      phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
      phoneRaw.startsWith("254") ? phoneRaw :
      phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
      phoneRaw.length === 9 ? `254${phoneRaw}` : phoneRaw;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 254712345678 or 07XXXXXXXX)" }, { status: 400 });
    }
    if (cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let subtotal = 0;
    const validatedCart: CartItem[] = [];
    for (const item of cart) {
      const price = Math.trunc(Number(item?.price ?? 0));
      const qty = Math.max(1, Math.trunc(Number(item?.quantity ?? 0)));
      if (!Number.isFinite(price) || price < 0) continue;
      validatedCart.push({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? "").slice(0, 200),
        price,
        quantity: qty,
        image: item?.image,
        category: item?.category,
      });
      subtotal += price * qty;
    }
    if (validatedCart.length === 0 || subtotal <= 0) {
      return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
    }

    const total = subtotal + shipping;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa/Daraja not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    let campaign = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", "merchandise")
      .maybeSingle()
      .then((r) => r.data as typeof r.data);

    if (!campaign) campaign = await ensureMerchandiseCampaign(supabase);

    if (!campaign) {
      return NextResponse.json(
        { error: "Merchandise not configured. Add an admin in Fusion Xpress or run database/ticketing_voting_mvp_patch_12_merchandise.sql." },
        { status: 503 }
      );
    }

    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;

    const { error: insertErr } = await supabase.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "daraja",
      email,
      payer_name: payerName,
      quantity: total,
      currency: campaign.currency,
      unit_amount: 1,
      amount: total,
      contestant_id: null,
      status: "pending",
      metadata: {
        slug: campaign.slug,
        campaign_title: campaign.title,
        merchandise_cart: true,
        cart: validatedCart,
        subtotal,
        shipping,
        total,
        phone,
      },
    });

    if (insertErr) {
      const msg = insertErr.message ?? "";
      const hint = /quantity|23514|check constraint|amount/i.test(msg)
        ? " Run database/ticketing_voting_mvp_patch_12_merchandise.sql in Supabase."
        : "";
      return NextResponse.json(
        { error: `Unable to create order.${hint}`, details: msg },
        { status: 400 }
      );
    }

    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    const oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error_description ?? "M-Pesa OAuth failed" },
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
      Amount: Math.round(total),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: `Merchandise (${validatedCart.reduce((s, i) => s + i.quantity, 0)} items)`,
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
      CheckoutRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "M-Pesa STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from M-Pesa" },
        { status: 502 }
      );
    }

    await supabase
      .from("transactions")
      .update({
        metadata: {
          slug: campaign.slug,
          campaign_title: campaign.title,
          merchandise_cart: true,
          cart: validatedCart,
          subtotal,
          shipping,
          total,
          phone,
          checkout_request_id: checkoutRequestId,
        },
      } as any)
      .eq("reference", reference);

    return NextResponse.json({
      reference,
      message: "Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
