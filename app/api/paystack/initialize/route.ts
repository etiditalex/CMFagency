import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureCfmaCampaign } from "@/lib/ensure-cfma-campaigns";
import { ensureCampaignFromEvent, normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { validateCoupon } from "@/lib/validate-coupon";
import { resolveInstallmentPaymentKes } from "@/lib/lipa-pole-pole";
import { validateReferredByNameOnly } from "@/lib/referred-by-name-only";

type InitBody = {
  slug?: string;
  email?: string;
  quantity?: number;
  contestant_id?: string | null;
  /** Payer display name (e.g. "John Doe") for dashboard visibility after payment */
  payer_name?: string | null;
  /** Kenya MSISDN (254…). Stored on the transaction for ticket purchases when provided. */
  payer_phone?: string | null;
  /** Optional: referrer name or phone for commission tracking */
  referred_by?: string | null;
  lipa_pole_pole_plan_id?: string | null;
  lipa_pole_pole_deposit_kes?: number | null;
  /** When true, return ref/amount/email for Paystack Inline popup (card entry on-page) instead of redirect URL */
  inline?: boolean;
  /** Coupon/promo code for discount */
  coupon_code?: string | null;
};

/**
 * Initializes a Paystack transaction.
 *
 * Security notes (per requirements):
 * - This endpoint does NOT mark transactions as successful.
 * - Payment success is confirmed only after Paystack reports a charge success:
 *   set the dashboard webhook to `https://YOUR_DOMAIN/api/paystack/webhook`
 *   (recommended on Vercel), or deploy the Supabase Edge Function `paystack-webhook`
 *   and point Paystack there.
 * - Pending rows can also be completed via `/api/paystack/verify-ref` (used while polling)
 *   or dashboard “Sync Paystack” (`/api/paystack/sync-pending`).
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

    const slug = normalizeSlug(body.slug ?? "") || (body.slug ?? "").trim().toLowerCase();
    const email = (body.email ?? "").trim();
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    const contestantId = body.contestant_id ?? null;
    const payerName = (body.payer_name ?? "").trim() || null;
    const couponCode = (body.coupon_code ?? "").trim() || null;
    const referredByRaw = (body.referred_by ?? "").trim().slice(0, 240);
    const referredByErr = validateReferredByNameOnly(referredByRaw);
    if (referredByErr) return NextResponse.json({ error: referredByErr }, { status: 400 });
    const referredBy = referredByRaw || null;

    const payerPhoneRaw = (body.payer_phone ?? "").trim().replace(/\s/g, "");
    const payerPhoneNorm =
      payerPhoneRaw.startsWith("+254") ? `254${payerPhoneRaw.slice(4)}` :
      payerPhoneRaw.startsWith("254") ? payerPhoneRaw :
      payerPhoneRaw.startsWith("0") ? `254${payerPhoneRaw.slice(1)}` :
      payerPhoneRaw.length === 9 && /^[17]/.test(payerPhoneRaw) ? `254${payerPhoneRaw}` :
      payerPhoneRaw;

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

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

    type CampaignRow = { id: string; created_by: string; type: string; slug: string; title: string; currency: string; unit_amount: number; max_per_txn: number };
    let campaign: CampaignRow | null = null;

    if (supabaseAdmin) {
      // 1) Try existing campaign by slug (service role, ignores RLS)
      const { data: adminCampaign } = await supabaseAdmin
        .from("campaigns")
        .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (adminCampaign) {
        const row = adminCampaign as CampaignRow & { is_active?: boolean };
        if (row.is_active === false) {
          return NextResponse.json(
            { error: "This ticket campaign is in draft. The event organizer needs to set it to Active in Dashboard → Campaigns." },
            { status: 400 }
          );
        }
        campaign = row as CampaignRow;
      } else {
        // 2) CFMA hard-coded tiers (legacy)
        const ensuredCfma = await ensureCfmaCampaign(supabaseAdmin, slug);
        if (ensuredCfma) {
          campaign = ensuredCfma;
        } else {
          // 3) New: auto-create ticket campaign from fusion_events
          const ensuredFromEvent = await ensureCampaignFromEvent(supabaseAdmin, slug);
          if (ensuredFromEvent) campaign = ensuredFromEvent;
        }
      }
    }
    if (!campaign) {
      // Fallback: anon client (should work if public policy allows select)
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
        .eq("slug", slug)
        .maybeSingle();
      if (campaignData) campaign = campaignData as CampaignRow;
    }

    if (!campaign) {
      const hint = !supabaseAdmin
        ? " If the campaign exists in Dashboard → Campaigns, add SUPABASE_SERVICE_ROLE_KEY to your deployment (e.g. Vercel) environment variables."
        : "";
      return NextResponse.json(
        { error: `No ticket campaign found for "${slug}". Create a campaign in Fusion Xpress (Dashboard → Campaigns) with this exact slug and set it to Active.${hint}` },
        { status: 404 }
      );
    }

    const maxVotes = 1000000;
    const maxTicketsPerTxn = 10000;
    const effectiveMax = campaign.type === "vote" ? maxVotes : Math.min(Number(campaign.max_per_txn), maxTicketsPerTxn);
    const q = Math.max(1, Math.min(effectiveMax, quantity));

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

    const installmentPlanId = (body.lipa_pole_pole_plan_id ?? "").trim();
    const installmentDepositRaw = body.lipa_pole_pole_deposit_kes;
    let useInstallment = false;
    let installmentPayKes = 0;
    let installmentTicketQty = 0;

    if (installmentPlanId) {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: "Lipa Pole Pole requires server configuration (SUPABASE_SERVICE_ROLE_KEY)." },
          { status: 500 }
        );
      }
      if (campaign.type !== "ticket") {
        return NextResponse.json({ error: "Lipa Pole Pole is only for ticket purchases." }, { status: 400 });
      }
      if (couponCode) {
        return NextResponse.json({ error: "Coupons cannot be combined with Lipa Pole Pole." }, { status: 400 });
      }
      if (!/^254[17]\d{8}$/.test(payerPhoneNorm)) {
        return NextResponse.json(
          { error: "Valid Kenya payer_phone is required for Lipa Pole Pole (Paystack)." },
          { status: 400 }
        );
      }
      const dep =
        installmentDepositRaw != null && Number.isFinite(Number(installmentDepositRaw))
          ? Math.trunc(Number(installmentDepositRaw))
          : undefined;
      const resInst = await resolveInstallmentPaymentKes(supabaseAdmin, installmentPlanId, dep, {
        email,
        phone: payerPhoneNorm,
      });
      if (!resInst.ok) {
        return NextResponse.json({ error: resInst.error }, { status: 400 });
      }
      if (resInst.plan.campaign_id !== campaign.id) {
        return NextResponse.json(
          { error: "That installment plan does not match this ticket package." },
          { status: 400 }
        );
      }
      useInstallment = true;
      installmentPayKes = resInst.payKes;
      installmentTicketQty = resInst.plan.ticket_quantity;
    }

    // Reference used to reconcile webhook and DB. Must be unique.
    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;

    let unitAmount = Number(campaign.unit_amount);
    let txQuantity = q;
    let amount = unitAmount * txQuantity;
    let couponId: string | null = null;
    let discountAmount = 0;

    const lipaMeta: Record<string, unknown> = useInstallment
      ? {
          lipa_pole_pole: true,
          lipa_pole_pole_plan_id: installmentPlanId,
          lipa_pole_pole_ticket_quantity: installmentTicketQty,
        }
      : {};

    if (useInstallment) {
      // quantity=1, unit_amount=KES keeps legacy DB quantity caps satisfied (see stk-push Lipa path).
      unitAmount = installmentPayKes;
      txQuantity = 1;
      amount = installmentPayKes;
    } else if (couponCode) {
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Coupon validation unavailable" }, { status: 500 });
      }
      const couponResult = await validateCoupon(
        supabaseAdmin,
        { id: campaign.id, created_by: campaign.created_by, unit_amount: campaign.unit_amount },
        couponCode,
        q
      );
      if (couponResult.valid) {
        couponId = couponResult.coupon_id;
        discountAmount = couponResult.discount_amount;
        amount = couponResult.amount;
      } else {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      }
    }

    const amountInt = Math.round(Number(amount));
    const discountInt = Math.round(Number(discountAmount));
    if (couponId && amountInt + discountInt !== q * unitAmount) {
      const expectedTotal = q * unitAmount;
      amount = expectedTotal - discountInt;
    }

    const amountMainRounded = Math.round(Number(amount));

    const payerPhoneStored =
      /^254[17]\d{8}$/.test(payerPhoneNorm) ? payerPhoneNorm : null;

    const txMetadata: Record<string, unknown> = {
      slug: campaign.slug,
      campaign_title: campaign.title,
      paystack_amount_subunit: amountMainRounded * 100,
      ...lipaMeta,
    };
    if (payerPhoneStored) txMetadata.payer_phone = payerPhoneStored;
    if (referredBy) txMetadata.referred_by = referredBy;

    const insertPayload = {
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "paystack",
      email,
      payer_name: payerName,
      quantity: txQuantity,
      currency: campaign.currency,
      unit_amount: unitAmount,
      amount: amountMainRounded,
      discount_amount: discountInt,
      coupon_id: couponId,
      contestant_id: campaign.type === "vote" ? contestantId : null,
      status: "pending",
      metadata: txMetadata,
    };

    const insertClient = couponId || useInstallment ? supabaseAdmin! : supabase;
    const { error: insertErr } = await insertClient.from("transactions").insert(insertPayload);

    if (insertErr) {
      const msg = insertErr?.message ?? "";
      const isRls =
        /policy|RLS|row level security|row-level security policy/i.test(msg);
      const isConstraint = /check constraint|transactions_amount|23514/i.test(msg);
      const isQuantityCheck = /transactions_quantity_check|quantity_check/i.test(msg);
      const isMissingColumn = /column.*does not exist|discount_amount|coupon_id/i.test(msg);
      let userError = "Unable to create transaction.";
      if (couponId && (isMissingColumn || isConstraint)) {
        userError =
          "Unable to create transaction with coupon. Ensure database patch 32 (coupons) has been run in Supabase.";
      } else if (isQuantityCheck) {
        userError =
          "Unable to create transaction. Database is restricting quantity amounts. Run database patch 12 (merchandise) which relaxes `transactions.quantity` to allow larger values (needed for Lipa Pole Pole deposits above 1,000).";
      } else if (isRls) {
        userError = "Unable to create transaction. Check: campaign is_active=true, dates valid.";
      }
      return NextResponse.json(
        {
          error: userError,
          details: msg,
        },
        { status: 400 }
      );
    }

    // Paystack expects amount in subunit (cents/kobo). Must match DB row (amount × 100) exactly.
    const amountInSubunit = amountMainRounded * 100;

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
      {
        display_name: campaign.type === "vote" ? "Votes" : useInstallment ? "Lipa Pole Pole" : "Tickets",
        variable_name: "quantity",
        value: useInstallment ? `KES ${installmentPayKes.toLocaleString()} installment` : String(q),
      },
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
          quantity: useInstallment ? installmentTicketQty : q,
          contestant_id: campaign.type === "vote" ? contestantId : null,
          slug: campaign.slug,
          custom_fields: customFields,
          ...(payerPhoneStored ? { payer_phone: payerPhoneStored } : {}),
          ...(referredBy ? { referred_by: referredBy } : {}),
          ...(useInstallment
            ? {
                lipa_pole_pole: true,
                lipa_pole_pole_plan_id: installmentPlanId,
                lipa_pole_pole_installment_kes: installmentPayKes,
              }
            : {}),
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

