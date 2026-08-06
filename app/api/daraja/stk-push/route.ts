import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureCfmaCampaign, isCfmaTicketSlug } from "@/lib/ensure-cfma-campaigns";
import { ensureCampaignFromEvent, normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { validateCoupon } from "@/lib/validate-coupon";
import { resolveInstallmentPaymentKes, isKenyaShillingsForLipa, normalizeKenyaCurrencyForPayments } from "@/lib/lipa-pole-pole";
import { validateReferredByNameOnly } from "@/lib/referred-by-name-only";
import { fetchDarajaAccessToken, prefetchDarajaAccessToken } from "@/lib/daraja-oauth";
import {
  buildStkAccountReference,
  buildStkTransactionDesc,
  buildDarajaStkPassword,
  darajaStkTimestamp,
  describeStkPushFailure,
  isStkPushAccepted,
  parseMpesaBusinessShortCode,
  resolveStkTransactionType,
  type StkPushJson,
} from "@/lib/daraja-stk-config";
import { normalizeKenyaPhone, parseOptionalKenyaPhone } from "@/lib/kenya-phone";
import { findVotingWindowRejection } from "@/lib/voting-window";

type StkPushBody = {
  slug?: string;
  phone?: string;
  email?: string;
  quantity?: number;
  contestant_id?: string | null;
  payer_name?: string | null;
  coupon_code?: string | null;
  /** Optional: referrer display name (not a phone number) */
  referred_by?: string | null;
  /** Optional: referrer Kenya phone (254…) */
  referrer_phone?: string | null;
  /** Lipa Pole Pole: pay toward an existing installment plan */
  lipa_pole_pole_plan_id?: string | null;
  lipa_pole_pole_deposit_kes?: number | null;
};

/**
 * Initiates M-Pesa STK Push via Daraja API.
 *
 * Flow:
 * 1. Create pending transaction in DB (provider: daraja)
 * 2. Get OAuth token from Safaricom
 * 3. Call Daraja STK Push - user gets prompt on phone
 * 4. Safaricom sends result to /api/daraja/callback
 *
 * Env required:
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_SHORTCODE (Business Short Code)
 * - MPESA_PASSKEY
 * - NEXT_PUBLIC_SITE_URL (for callback)
 *
 * Optional:
 * - MPESA_BASE_URL (default: sandbox)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StkPushBody;

    const slug = normalizeSlug(body.slug ?? "") || (body.slug ?? "").trim().toLowerCase();
    const phoneRaw = (body.phone ?? "").trim().replace(/\s/g, "");
    const email = (body.email ?? "").trim();
    const quantity = Math.trunc(Number(body.quantity ?? 0));
    const contestantId = body.contestant_id ?? null;
    const payerName = (body.payer_name ?? "").trim() || null;
    const couponCode = (body.coupon_code ?? "").trim() || null;
    const referredByRaw = (body.referred_by ?? "").trim().slice(0, 240);
    const referredByErr = validateReferredByNameOnly(referredByRaw);
    if (referredByErr) return NextResponse.json({ error: referredByErr }, { status: 400 });
    let referredBy = referredByRaw || null;

    const referrerPhoneParsed = parseOptionalKenyaPhone(body.referrer_phone ?? "");
    if (referrerPhoneParsed.error) {
      return NextResponse.json({ error: referrerPhoneParsed.error }, { status: 400 });
    }
    let referrerPhone = referrerPhoneParsed.phone;

    const phone = normalizeKenyaPhone(phoneRaw);

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 254712345678)" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    // Production: Safaricom may provide custom proxy URLs. Use these if set.
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa/Daraja credentials not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY." },
        { status: 500 }
      );
    }

    const businessShortCode = parseMpesaBusinessShortCode(shortCode);
    if (!businessShortCode) {
      return NextResponse.json({ error: "MPESA_SHORTCODE must be a valid numeric business short code." }, { status: 500 });
    }

    const transactionType = resolveStkTransactionType();

    // Overlap Safaricom OAuth with campaign lookup + DB insert below.
    prefetchDarajaAccessToken();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : null;

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            "M-Pesa requires SUPABASE_SERVICE_ROLE_KEY on the server so checkout IDs can be stored for payment confirmation.",
        },
        { status: 500 }
      );
    }

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
    campaign = {
      ...campaign,
      currency: normalizeKenyaCurrencyForPayments(campaign.currency),
    };
    if (!isKenyaShillingsForLipa(campaign.currency)) {
      return NextResponse.json({ error: "M-Pesa is only available for KES campaigns" }, { status: 400 });
    }

    const maxVotes = 1000000;
    const maxTicketsPerTxn = 10000;
    const effectiveMax = campaign.type === "vote" ? maxVotes : Math.min(Number(campaign.max_per_txn), maxTicketsPerTxn);
    const q = Math.max(1, Math.min(effectiveMax, quantity));

    if (campaign.type === "vote") {
      const windowRejection = await findVotingWindowRejection(supabaseAdmin);
      if (windowRejection) return NextResponse.json({ error: windowRejection }, { status: 400 });

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
      const dep =
        installmentDepositRaw != null && Number.isFinite(Number(installmentDepositRaw))
          ? Math.trunc(Number(installmentDepositRaw))
          : undefined;
      const resInst = await resolveInstallmentPaymentKes(supabaseAdmin, installmentPlanId, dep, { email, phone });
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
      if (!referredBy && resInst.plan.referred_by) referredBy = resInst.plan.referred_by;
      if (!referrerPhone && resInst.plan.referrer_phone) referrerPhone = resInst.plan.referrer_phone;
    }

    if (isCfmaTicketSlug(slug) && campaign.type === "ticket" && !referrerPhone) {
      return NextResponse.json(
        { error: "Referrer phone is required for CFM ticket purchases." },
        { status: 400 }
      );
    }

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
      // Use quantity=1 and unit_amount=KES so `transactions.quantity <= 1000` (legacy DB) still allows any installment size.
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
      amount = q * unitAmount - discountInt;
    }

    const insertPayload = {
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "daraja",
      email: email || null,
      payer_name: payerName,
      quantity: txQuantity,
      currency: campaign.currency,
      unit_amount: unitAmount,
      amount: Math.round(Number(amount)),
      discount_amount: discountInt,
      coupon_id: couponId,
      contestant_id: campaign.type === "vote" ? contestantId : null,
      status: "pending",
      metadata: {
        slug: campaign.slug,
        campaign_title: campaign.title,
        phone,
        payer_phone: phone,
        ...(referredBy ? { referred_by: referredBy } : {}),
        ...(referrerPhone ? { referrer_phone: referrerPhone } : {}),
        ...lipaMeta,
      },
    };

    const insertClient = supabaseAdmin;
    const { error: insertErr } = await insertClient.from("transactions").insert(insertPayload);

    if (insertErr) {
      const msg = insertErr?.message ?? "";
      const isRls =
        /policy|RLS|row level security|row-level security policy/i.test(msg);
      const isConstraint = /check constraint|transactions_amount|23514/i.test(msg);
      const isQuantityCheck = /transactions_quantity_check|quantity_check/i.test(msg);
      const isMissingColumn = /column.*does not exist|discount_amount|coupon_id/i.test(msg);
      let userError = isRls ? "Unable to create transaction." : msg;
      if (couponId && (isMissingColumn || isConstraint)) {
        userError =
          "Unable to create transaction with coupon. Ensure database patch 32 (coupons) has been run in Supabase.";
      } else if (isQuantityCheck) {
        userError =
          "Unable to create transaction. Database is restricting quantity amounts. Run database patch 12 (merchandise) which relaxes `transactions.quantity` to allow larger values (needed for Lipa Pole Pole deposits above 1,000).";
      }
      return NextResponse.json(
        { error: userError, details: msg },
        { status: 400 }
      );
    }

    const amountKes = Math.round(Number(amount));
    if (!Number.isFinite(amountKes) || amountKes < 1) {
      return NextResponse.json({ error: "Payment amount must be at least KES 1." }, { status: 400 });
    }

    const tokenResult = await fetchDarajaAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: 502 });
    }

    const timestamp = darajaStkTimestamp();
    const password = buildDarajaStkPassword(businessShortCode, passKey, timestamp);

    const callbackBase = `${siteUrl}`.replace(/\/$/, "") || "https://cmfagency.co.ke";
    const callbackUrl = `${callbackBase}/api/daraja/callback`;

    const stkBody = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amountKes,
      PartyA: phone,
      PartyB: businessShortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: buildStkAccountReference(reference),
      TransactionDesc: useInstallment ? "Lipa Pole" : buildStkTransactionDesc(campaign.type, q),
    };

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkBody),
    });

    const stkJson = (await stkRes.json()) as StkPushJson;

    if (!stkRes.ok) {
      return NextResponse.json(
        { error: describeStkPushFailure(stkJson, stkRes.status) },
        { status: 502 }
      );
    }

    if (!isStkPushAccepted(stkJson)) {
      return NextResponse.json(
        {
          error:
            describeStkPushFailure(stkJson, stkRes.status) ||
            "M-Pesa did not accept the payment request. Check MPESA_SHORTCODE, passkey, and transaction type (Till vs Paybill).",
        },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID!;
    const merchantRequestId = stkJson.MerchantRequestID ?? null;

    const metaUpdate = {
      ...(insertPayload.metadata as Record<string, unknown>),
      checkout_request_id: checkoutRequestId,
      ...(merchantRequestId ? { merchant_request_id: merchantRequestId } : {}),
    };
    const { error: metaErr } = await supabaseAdmin
      .from("transactions")
      .update({ metadata: metaUpdate } as Record<string, unknown>)
      .eq("reference", reference);

    if (metaErr) {
      console.error("[daraja/stk-push] Failed to store checkout_request_id:", metaErr.message);
      return NextResponse.json(
        {
          error:
            "M-Pesa prompt was sent but we could not link it to your order. Contact support with reference: " +
            reference,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference,
      checkout_request_id: checkoutRequestId,
      message: "Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
