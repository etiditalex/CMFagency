import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

import { ensureVisitorSubscriptionCampaign } from "@/lib/ensure-visitor-subscription-campaign";
import {
  buildVisitorSubscriptionPaymentMetadata,
  getVisitorSubscriptionAmountUsd,
  getVisitorSubscriptionAmountKes,
  getVisitorSubscriptionPaystackSubunit,
  parseBillingInterval,
  parsePaidVisitorPlan,
  type PaidVisitorPlan,
  type VisitorBillingInterval,
} from "@/lib/visitors/subscription-pricing";

export type CreateSubscriptionPaymentInput = {
  admin: SupabaseClient;
  ownerId: string;
  email: string;
  payerName: string | null;
  plan: PaidVisitorPlan;
  billingInterval: VisitorBillingInterval;
  provider: "paystack" | "daraja";
  phone?: string | null;
};

export type CreateSubscriptionPaymentResult =
  | {
      ok: true;
      reference: string;
      amountAud: number;
      amountKes: number;
      paystackSubunit: number;
      currency: string;
      email: string;
      campaignId: string;
      metadata: Record<string, unknown>;
    }
  | { ok: false; error: string; status?: number };

export async function createVisitorSubscriptionPayment(
  input: CreateSubscriptionPaymentInput
): Promise<CreateSubscriptionPaymentResult> {
  const { admin, ownerId, email, payerName, plan, billingInterval, provider, phone } = input;

  const campaign = await ensureVisitorSubscriptionCampaign(admin);
  if (!campaign) {
    return {
      ok: false,
      status: 503,
      error:
        "Subscription billing is not set up yet. A Fusion Xpress admin must sign in once so the system can create the billing campaign.",
    };
  }

  if ((campaign as { is_active?: boolean }).is_active === false) {
    return { ok: false, status: 400, error: "Subscription payments are paused. Contact support." };
  }

  const amountAud = getVisitorSubscriptionAmountUsd(plan, billingInterval);
  const amountKes = getVisitorSubscriptionAmountKes(plan, billingInterval);
  const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;

  const metadata = buildVisitorSubscriptionPaymentMetadata({
    ownerId,
    plan,
    billingInterval,
    slug: campaign.slug,
    campaignTitle: campaign.title,
    phone: phone ?? null,
  });
  metadata.payment_reference = reference;

  const isPaystack = provider === "paystack";
  const insertPayload = {
    campaign_id: campaign.id,
    campaign_type: campaign.type,
    reference,
    provider,
    email,
    payer_name: payerName,
    quantity: 1,
    currency: isPaystack ? "AUD" : "KES",
    unit_amount: isPaystack ? amountAud : amountKes,
    amount: isPaystack ? Math.round(amountAud) : Math.round(amountKes),
    discount_amount: 0,
    coupon_id: null,
    contestant_id: null,
    status: "pending",
    metadata: {
      ...metadata,
      paystack_amount_subunit: getVisitorSubscriptionPaystackSubunit(plan, billingInterval),
      paystack_currency: "AUD",
      mpesa_amount_kes: amountKes,
    },
  };

  const { error: insertErr } = await admin.from("transactions").insert(insertPayload as Record<string, unknown>);
  if (insertErr) {
    return { ok: false, status: 400, error: insertErr.message ?? "Could not start payment" };
  }

  return {
    ok: true,
    reference,
    amountAud,
    amountKes,
    paystackSubunit: getVisitorSubscriptionPaystackSubunit(plan, billingInterval),
    currency: "AUD",
    email,
    campaignId: campaign.id,
    metadata,
  };
}

export function parseSubscriptionPaymentBody(body: Record<string, unknown>): {
  plan: PaidVisitorPlan | null;
  billingInterval: VisitorBillingInterval;
} {
  return {
    plan: parsePaidVisitorPlan(
      typeof body.plan === "string" ? body.plan : String(body.plan ?? "")
    ),
    billingInterval: parseBillingInterval(
      typeof body.billingInterval === "string"
        ? body.billingInterval
        : String(body.billing_interval ?? "monthly")
    ),
  };
}