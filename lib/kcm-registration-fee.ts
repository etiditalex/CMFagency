import type { SupabaseClient } from "@supabase/supabase-js";

/** Default matches historical KCM launch price; overridden by `kcm_registration_settings` when present. */
export const KCM_REGISTRATION_FEE_DEFAULT_KES = 50;
/** Forum attendance for an existing member. Overridden on the KCM membership board. */
export const KCM_FORUM_MEMBER_FEE_DEFAULT_KES = 200;
/** Forum attendance for someone joining as a new member. Overridden on the KCM membership board. */
export const KCM_FORUM_NON_MEMBER_FEE_DEFAULT_KES = 300;
const MIN_KES = 1;
const MAX_KES = 1_000_000;

export type KcmFeeSettings = {
  registrationFeeKes: number;
  forumMemberFeeKes: number;
  forumNonMemberFeeKes: number;
};

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
  const settings = await getKcmFeeSettings(admin);
  return settings.registrationFeeKes;
}

const FEE_DEFAULTS: KcmFeeSettings = {
  registrationFeeKes: KCM_REGISTRATION_FEE_DEFAULT_KES,
  forumMemberFeeKes: KCM_FORUM_MEMBER_FEE_DEFAULT_KES,
  forumNonMemberFeeKes: KCM_FORUM_NON_MEMBER_FEE_DEFAULT_KES,
};

function clampOrDefault(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return clampKcmRegistrationFeeKes(raw);
}

/**
 * Membership registration fee plus the two forum attendance fees.
 * Missing forum columns fall back to KES 200 (members) and KES 300 (new members).
 */
export async function getKcmFeeSettings(admin: SupabaseClient): Promise<KcmFeeSettings> {
  const { data, error } = await admin
    .from("kcm_registration_settings")
    .select("registration_fee_kes, forum_member_fee_kes, forum_non_member_fee_kes")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    const missingColumn = error?.code === "42703" || (error?.message ?? "").includes("forum_");
    if (!missingColumn && error) return FEE_DEFAULTS;
    if (missingColumn) {
      const legacy = await getKcmRegistrationFeeKesFromLegacy(admin);
      return { ...FEE_DEFAULTS, registrationFeeKes: legacy };
    }
    return FEE_DEFAULTS;
  }
  const row = data as {
    registration_fee_kes?: number;
    forum_member_fee_kes?: number | null;
    forum_non_member_fee_kes?: number | null;
  };
  return {
    registrationFeeKes: clampOrDefault(row.registration_fee_kes, KCM_REGISTRATION_FEE_DEFAULT_KES),
    forumMemberFeeKes: clampOrDefault(row.forum_member_fee_kes, KCM_FORUM_MEMBER_FEE_DEFAULT_KES),
    forumNonMemberFeeKes: clampOrDefault(row.forum_non_member_fee_kes, KCM_FORUM_NON_MEMBER_FEE_DEFAULT_KES),
  };
}

async function getKcmRegistrationFeeKesFromLegacy(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("kcm_registration_settings")
    .select("registration_fee_kes")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return KCM_REGISTRATION_FEE_DEFAULT_KES;
  return clampKcmRegistrationFeeKes((data as { registration_fee_kes?: number }).registration_fee_kes);
}
