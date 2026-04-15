import type { SupabaseClient } from "@supabase/supabase-js";

/** Default matches historical KCM launch price; overridden by `kcm_registration_settings` when present. */
export const KCM_REGISTRATION_FEE_DEFAULT_KES = 50;
const MIN_KES = 1;
const MAX_KES = 1_000_000;

export function clampKcmRegistrationFeeKes(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return KCM_REGISTRATION_FEE_DEFAULT_KES;
  return Math.min(MAX_KES, Math.max(MIN_KES, Math.floor(n)));
}

/**
 * Reads the configured KCM membership registration fee (KES) from the singleton settings row.
 * Falls back to {@link KCM_REGISTRATION_FEE_DEFAULT_KES} if the table is missing or empty.
 */
export async function getKcmRegistrationFeeKes(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("kcm_registration_settings")
    .select("registration_fee_kes")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return KCM_REGISTRATION_FEE_DEFAULT_KES;
  return clampKcmRegistrationFeeKes((data as { registration_fee_kes?: number }).registration_fee_kes);
}
