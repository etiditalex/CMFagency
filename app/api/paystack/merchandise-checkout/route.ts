import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
};

type InitBody = {
  email?: string;
  cart?: CartItem[];
  shipping?: number;
  inline?: boolean;
};

const DEFAULT_SHIPPING = 500; // KES

/**
 * Merchandise checkout - integrates cart with Fusion Xpress Paystack flow.
 * Creates a transaction for the merchandise campaign and initializes Paystack.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitBody;

    const email = (body.email ?? "").trim();
    const cart = Array.isArray(body.cart) ? body.cart : [];
    const shipping = Math.max(0, Math.trunc(Number(body.shipping ?? DEFAULT_SHIPPING)));
    const useInline = body.inline === true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let subtotal = 0;
    const validatedCart: CartItem[] = [];
    for (const item of cart) {
      const id = Number(item?.id);
      const price = Math.trunc(Number(item?.price ?? 0));
      const qty = Math.max(1, Math.trunc(Number(item?.quantity ?? 0)));
      if (!Number.isFinite(price) || price < 0) continue;
      validatedCart.push({
        id,
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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !paystackSecret) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY or Supabase env vars missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", "merchandise")
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json(
        {
          error: "Merchandise checkout not configured. Run database/ticketing_voting_mvp_patch_12_merchandise.sql",
        },
        { status: 503 }
      );
    }

    // Merchandise campaign uses unit_amount=1, quantity=total (in whole KES)
    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;

    const { error: insertErr } = await supabase.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "paystack",
      email,
      quantity: total, // unit_amount=1, so amount = quantity
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
      },
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "Unable to create order", details: insertErr.message },
        { status: 400 }
      );
    }

    const amountInSubunit = Math.round(total * 100);

    if (useInline) {
      return NextResponse.json({
        reference,
        amount_subunit: amountInSubunit,
        email,
        currency: campaign.currency,
        channels: ["card", "mobile_money"],
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const callback_url = `${callbackBase.replace(/\/$/, "")}/cart?ref=${encodeURIComponent(reference)}`;

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
          campaign_type: campaign.type,
          slug: campaign.slug,
          merchandise_cart: true,
        },
      }),
    });

    const paystackJson = (await paystackRes.json()) as { status?: boolean; data?: { authorization_url?: string }; message?: string };

    if (!paystackRes.ok || !paystackJson?.status) {
      return NextResponse.json(
        { error: paystackJson?.message ?? "Paystack initialize failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      authorization_url: paystackJson.data?.authorization_url,
      reference,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
