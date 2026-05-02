import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureCfmaCampaign } from "@/lib/ensure-cfma-campaigns";
import { ensureCampaignFromEvent, normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { validateCoupon } from "@/lib/validate-coupon";
import { resolveInstallmentPaymentKes } from "@/lib/lipa-pole-pole";
import { validateReferredByNameOnly } from "@/lib/referred-by-name-only";

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
    const referredBy = referredByRaw || null;

    // Normalize phone: 254XXXXXXXXX (Kenya)
    const phone =
      phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
      phoneRaw.startsWith("254") ? phoneRaw :
      phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
      phoneRaw.length === 9 ? `254${phoneRaw}` :
      phoneRaw;

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
    let oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    if (!oauthUrl.includes("grant_type=")) {
      oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
    }
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa/Daraja credentials not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY." },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

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
    if (String(campaign.currency).toUpperCase() !== "KES") {
      return NextResponse.json({ error: "M-Pesa is only available for KES campaigns" }, { status: 400 });
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
        ...(referredBy ? { referred_by: referredBy } : {}),
        ...lipaMeta,
      },
    };

    const insertClient = couponId ? supabaseAdmin! : supabase;
    const { error: insertErr } = await insertClient.from("transactions").insert(insertPayload);

    if (insertErr) {
      const msg = insertErr?.message ?? "";
      const isRls = /policy|RLS|row level security/i.test(msg) || msg.includes("violates");
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

    // Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    let tokenRes: Response;
    try {
      tokenRes = await fetch(oauthUrl, {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
      return NextResponse.json(
        { error: `Cannot reach Daraja OAuth (${msg}). Check MPESA_OAUTH_URL or MPESA_BASE_URL.` },
        { status: 502 }
      );
    }

    let tokenJson: { access_token?: string; error?: string; error_description?: string };
    try {
      tokenJson = (await tokenRes.json()) as typeof tokenJson;
    } catch {
      return NextResponse.json(
        { error: `Daraja OAuth returned invalid response (HTTP ${tokenRes.status}). Check MPESA_OAUTH_URL.` },
        { status: 502 }
      );
    }

    if (!tokenRes.ok || !tokenJson.access_token) {
      const statusHint =
        tokenRes.status === 401 ? "Invalid consumer key or secret" :
        tokenRes.status === 404 ? "OAuth URL not found — check MPESA_OAUTH_URL" :
        tokenRes.status >= 500 ? "Safaricom server error — try again later" :
        "Failed to get Daraja OAuth token";
      const errMsg = tokenJson.error_description ?? tokenJson.error ?? statusHint;
      return NextResponse.json(
        { error: `${errMsg} (HTTP ${tokenRes.status})` },
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
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: useInstallment
        ? `LipaPolePole ${campaign.slug}`.slice(0, 20)
        : `${campaign.title?.slice(0, 20) ?? campaign.slug} (${q} ${campaign.type === "ticket" ? "ticket(s)" : "vote(s)"})`,
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
      MerchantRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from Daraja" },
        { status: 502 }
      );
    }

    // Store CheckoutRequestID for callback lookup (service role needed for update)
    const metaUpdate = {
      ...(insertPayload.metadata as Record<string, unknown>),
      checkout_request_id: checkoutRequestId,
    };
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("transactions")
        .update({ metadata: metaUpdate } as Record<string, unknown>)
        .eq("reference", reference);
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
