import type { SupabaseClient } from "@supabase/supabase-js";

export const LIPA_POLE_POLE_MIN_KES = 50;

export type CfmInstallmentPlanRow = {
  id: string;
  installment_token: string;
  campaign_id: string;
  campaign_slug: string;
  email: string;
  phone: string;
  payer_name: string | null;
  referred_by: string | null;
  ticket_quantity: number;
  unit_amount: number;
  total_due: number;
  amount_paid: number;
  status: string;
  reminder_count: number;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
};

export function normalizeInstallmentEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isLipaPolePoleMetadata(meta: unknown): meta is Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const m = meta as Record<string, unknown>;
  return m.lipa_pole_pole === true && typeof m.lipa_pole_pole_plan_id === "string";
}

/** Clamp installment payment: at least min (or full balance if smaller), at most remaining balance. */
export function clampInstallmentPaymentKes(
  requested: number | undefined,
  balanceKes: number
): { payKes: number; error?: string } {
  if (balanceKes <= 0) {
    return { payKes: 0, error: "This plan is already fully paid." };
  }
  const raw = requested != null && Number.isFinite(requested) ? Math.floor(requested) : balanceKes;
  const minPay = Math.min(LIPA_POLE_POLE_MIN_KES, balanceKes);
  const payKes = Math.min(balanceKes, Math.max(minPay, Math.min(raw, balanceKes)));
  return { payKes };
}

export async function resolveInstallmentPaymentKes(
  supabaseAdmin: SupabaseClient,
  planId: string,
  requestedDepositKes: number | undefined,
  buyer: { email: string; phone: string }
): Promise<{ ok: false; error: string } | { ok: true; plan: CfmInstallmentPlanRow; payKes: number }> {
  const { data: plan, error } = await supabaseAdmin
    .from("cfm_installment_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error || !plan) {
    return { ok: false, error: "Installment plan not found." };
  }

  const p = plan as CfmInstallmentPlanRow;
  if (p.status !== "active") {
    return { ok: false, error: "This installment plan is no longer active." };
  }
  if (normalizeInstallmentEmail(p.email) !== normalizeInstallmentEmail(buyer.email)) {
    return { ok: false, error: "Email does not match this Lipa Pole Pole plan." };
  }
  if (p.phone !== buyer.phone) {
    return { ok: false, error: "Phone number does not match this Lipa Pole Pole plan." };
  }

  const balance = p.total_due - p.amount_paid;
  const { payKes, error: clampErr } = clampInstallmentPaymentKes(requestedDepositKes, balance);
  if (clampErr) return { ok: false, error: clampErr };
  return { ok: true, plan: p, payKes };
}

export type LipaApplyArgs = {
  supabase: SupabaseClient;
  transactionId: string;
  campaignId: string;
  /** KES received for this transaction row */
  paymentAmountKes: number;
  /** Metadata after provider success (merged base) */
  metadataBase: Record<string, unknown>;
};

/**
 * Credits an installment plan and issues tickets when fully paid.
 * Caller should set transaction fulfilled_at after success.
 */
export async function applyLipaPolePolePaymentSuccess(
  args: LipaApplyArgs
): Promise<{ fulfillErr: string | null; metadataExtra: Record<string, unknown>; planCompleted: boolean }> {
  const { supabase, transactionId, campaignId, paymentAmountKes, metadataBase } = args;
  const planId = String(metadataBase.lipa_pole_pole_plan_id ?? "");
  if (!planId) {
    return { fulfillErr: "lipa_pole_pole_plan_id missing", metadataExtra: {}, planCompleted: false };
  }

  const { data: planRow, error: planErr } = await supabase
    .from("cfm_installment_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (planErr || !planRow) {
    return { fulfillErr: "Installment plan not found after payment.", metadataExtra: {}, planCompleted: false };
  }

  const plan = planRow as CfmInstallmentPlanRow;
  if (plan.status === "completed") {
    const bal = Math.max(0, plan.total_due - plan.amount_paid);
    return {
      fulfillErr: null,
      metadataExtra: {
        lipa_pole_pole_balance_remaining_kes: bal,
        lipa_pole_pole_amount_paid_kes: plan.amount_paid,
        lipa_pole_pole_total_due_kes: plan.total_due,
        lipa_pole_pole_plan_completed: true,
        lipa_pole_pole_tickets_issued: plan.ticket_quantity,
        lipa_pole_pole_idempotent: true,
      },
      planCompleted: true,
    };
  }
  if (plan.status !== "active") {
    return { fulfillErr: null, metadataExtra: { lipa_pole_pole_note: "plan_not_active_skip" }, planCompleted: false };
  }

  const payDelta = Math.round(paymentAmountKes);
  const newPaid = Math.min(plan.total_due, plan.amount_paid + payDelta);
  const completed = newPaid >= plan.total_due;
  const nextReminderIso = completed
    ? null
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const balanceRemaining = Math.max(0, plan.total_due - newPaid);

  const { error: upErr } = await supabase
    .from("cfm_installment_plans")
    .update({
      amount_paid: newPaid,
      status: completed ? "completed" : "active",
      updated_at: new Date().toISOString(),
      next_reminder_at: nextReminderIso,
    })
    .eq("id", planId);

  if (upErr) {
    return { fulfillErr: upErr.message, metadataExtra: {}, planCompleted: false };
  }

  let fulfillErr: string | null = null;
  if (completed) {
    const { error: tErr } = await supabase.from("ticket_issues").upsert(
      {
        transaction_id: transactionId,
        campaign_id: campaignId,
        quantity: plan.ticket_quantity,
      },
      { onConflict: "transaction_id" }
    );
    if (tErr) fulfillErr = tErr.message;
  }

  const metadataExtra: Record<string, unknown> = {
    lipa_pole_pole_balance_remaining_kes: balanceRemaining,
    lipa_pole_pole_amount_paid_kes: newPaid,
    lipa_pole_pole_total_due_kes: plan.total_due,
    lipa_pole_pole_plan_completed: completed,
    lipa_pole_pole_tickets_issued: completed ? plan.ticket_quantity : 0,
  };

  return { fulfillErr, metadataExtra, planCompleted: completed };
}
