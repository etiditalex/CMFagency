import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type InitBody = {
  slug?: string;
  email?: string;
  quantity?: number;
  contestant_id?: string | null;
  /** Payer display name (e.g. "John Doe") for dashboard visibility after payment */
  payer_name?: string | null;
  /** When true, return ref/amount/email for Paystack Inline popup (card entry on-page) instead of redirect URL */
  inline?: boolean;
};

/**
 * Initializes a Paystack transaction.
 *
 * Security notes (per requirements):
 * - This endpoint does NOT mark transactions as successful.
 * - Payment success is ONLY confirmed via webhook (Supabase Edge Function).
 * - We insert a "pending" transaction first under RLS rules using the anon key.
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - PAYSTACK_SECRET_KEY (server-side only)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitBody;

    const slug = (body.slug ?? "").trim().toLowerCase();
    const email = (body.email ?? "").trim();
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    const contestantId = body.contestant_id ?? null;
    const payerName = (body.payer_name ?? "").trim() || null;

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured" }, { status: 500 });
    }

    // Use anon key so inserts are governed by RLS (public can create pending txns only).
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", slug)
      .single();

    if (campaignErr) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

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

    // Reference used to reconcile webhook and DB. Must be unique.
    // (No secrets here: it's ok to expose references publicly.)
    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;

    const unitAmount = Number(campaign.unit_amount);
    const amount = unitAmount * q;

    // Insert "pending" transaction. RLS restricts this to pending-only inserts.
    const { error: insertErr } = await supabase.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "paystack",
      email,
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
      },
    });

    if (insertErr) {
      const msg = insertErr?.message ?? "";
      const isRls = /policy|RLS|row level security/i.test(msg) || msg.includes("violates");
      return NextResponse.json(
        {
          error: isRls
            ? "Unable to create transaction. Check: campaign is_active=true, dates valid."
            : "Unable to create transaction.",
          details: msg,
        },
        { status: 400 }
      );
    }

    // Paystack expects amount in subunit (cents/kobo). 1 KES = 100 cents.
    const amountInSubunit = Math.round(amount * 100);

    const origin = req.headers.get("origin") ?? "";
    const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const callback_url = `${callbackBase}/${campaign.slug}?ref=${reference}`;

    const ticketNumber = (() => {
      const suffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
      const prefix = campaign.slug
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      const typeCode = campaign.type === "vote" ? "VOT" : "TKT";
      return `${prefix}-${typeCode}-${suffix}`;
    })();

    const customFields: Array<{ display_name: string; variable_name: string; value: string }> = [
      { display_name: campaign.type === "vote" ? "Vote number" : "Ticket number", variable_name: "ticket_number", value: ticketNumber },
      { display_name: campaign.type === "vote" ? "Vote holder" : "Ticket holder", variable_name: "holder", value: payerName ?? email },
      { display_name: campaign.type === "vote" ? "Votes" : "Tickets", variable_name: "quantity", value: String(q) },
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
          quantity: q,
          contestant_id: campaign.type === "vote" ? contestantId : null,
          slug: campaign.slug,
          custom_fields: customFields,
        },
      }),
    });

    const paystackJson = (await paystackRes.json()) as any;

    if (!paystackRes.ok || !paystackJson?.status) {
      // Keep transaction pending; webhook won't mark it successful anyway.
      return NextResponse.json(
        { error: paystackJson?.message ?? "Paystack initialize failed" },
        { status: 502 }
      );
    }

    const useInline = body.inline === true;
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
      authorization_url: paystackJson.data.authorization_url as string,
      reference,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}

