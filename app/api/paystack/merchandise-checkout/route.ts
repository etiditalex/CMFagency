import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureMerchandiseCampaign } from "@/lib/ensure-cfma-campaigns";

type CartItem = {
  id: number;
  variant_key?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  size?: string | null;
  color?: string | null;
};

type InitBody = {
  email?: string;
  payer_name?: string | null;
  cart?: CartItem[];
  shipping?: number;
  inline?: boolean;
};

const DEFAULT_SHIPPING = 0; // KES — disabled for merchandise for now

/**
 * Merchandise checkout - integrates cart with Fusion Xpress Paystack flow.
 * Creates a transaction for the merchandise campaign and initializes Paystack.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitBody;

    const email = (body.email ?? "").trim();
    const payerName = (body.payer_name ?? "").trim() || null;
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
        variant_key: typeof (item as any)?.variant_key === "string" ? String((item as any).variant_key).slice(0, 200) : undefined,
        name: String(item?.name ?? "").slice(0, 200),
        price,
        quantity: qty,
        image: item?.image,
        category: item?.category,
        size: typeof (item as any)?.size === "string" ? String((item as any).size).slice(0, 40) : null,
        color: typeof (item as any)?.color === "string" ? String((item as any).color).slice(0, 40) : null,
      });
      subtotal += price * qty;
    }

    if (validatedCart.length === 0 || subtotal <= 0) {
      return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
    }

    const total = subtotal + shipping;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !paystackSecret) {
      return NextResponse.json(
        { error: "Payment is not configured. Set PAYSTACK_SECRET_KEY and Supabase env vars (see deployment docs)." },
        { status: 500 }
      );
    }

    // Prefer service role so transaction insert is not blocked by RLS (e.g. anon policy edge cases).
    const supabase =
      supabaseServiceKey && supabaseUrl
        ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
        : createClient(supabaseUrl, supabaseAnonKey);

    let campaign = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", "merchandise")
      .maybeSingle()
      .then((r) => r.data as typeof r.data);

    if (!campaign && supabaseServiceKey && supabaseUrl) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
      campaign = await ensureMerchandiseCampaign(adminClient);
    }

    if (!campaign) {
      const hint = " Add an admin in Fusion Xpress (Users or portal_members), then try again. Or run database/ticketing_voting_mvp_patch_12_merchandise.sql in Supabase.";
      return NextResponse.json(
        { error: `Merchandise checkout not configured.${hint}` },
        { status: 503 }
      );
    }

    // Merchandise campaign uses unit_amount=1, quantity=total (in whole KES)
    // Paystack reference: only alphanumeric, hyphen, period, equals
    const reference = `cmf-${crypto.randomUUID().replace(/-/g, "")}`;

    const amountInSubunit = total * 100;

    const { error: insertErr } = await supabase.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "paystack",
      email,
      payer_name: payerName,
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
        paystack_amount_subunit: amountInSubunit,
      },
    });

    if (insertErr) {
      const msg = insertErr.message ?? "";
      const isConstraint = /quantity|23514|check constraint|amount/i.test(msg);
      const hint = isConstraint
        ? " Ensure database/ticketing_voting_mvp_patch_12_merchandise.sql has been run in Supabase (relaxes quantity/amount limits for merchandise)."
        : "";
      return NextResponse.json(
        { error: `Unable to create order.${hint}`, details: msg },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "";
    const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const callback_url = `${callbackBase.replace(/\/$/, "")}/cart?ref=${encodeURIComponent(reference)}`;

    const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
    const prefix = "MERCHANDISE".slice(0, 8);
    const itemCount = validatedCart.reduce((sum, i) => sum + i.quantity, 0);
    const customFields: Array<{ display_name: string; variable_name: string; value: string }> = [
      { display_name: "Order number", variable_name: "order_number", value: `${prefix}-ORD-${ticketSuffix}` },
      { display_name: "Customer", variable_name: "holder", value: payerName ?? email },
      { display_name: "Items", variable_name: "quantity", value: String(itemCount) },
    ];

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
          custom_fields: customFields,
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

    if (useInline) {
      return NextResponse.json({
        reference,
        amount_subunit: amountInSubunit,
        email,
        currency: campaign.currency,
        channels: ["card", "mobile_money"],
      });
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
