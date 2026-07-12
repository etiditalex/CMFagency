import { CMFA_EVENT_SLUG } from "@/lib/cmfa-registration";

export const MODEL_NOMINATION_EVENT_SLUG = CMFA_EVENT_SLUG;

export const MODEL_NOMINATION_CATEGORIES = [
  { value: "top_10_male", label: "Top 10 Male Models" },
  { value: "top_10_female", label: "Top 10 Female Models" },
] as const;

export type ModelNominationCategory =
  (typeof MODEL_NOMINATION_CATEGORIES)[number]["value"];

export type ModelNominationStatus =
  | "new"
  | "reviewed"
  | "shortlisted"
  | "rejected";

export type ModelNomination = {
  id: string;
  event_slug: string;
  nominator_name: string | null;
  nominator_email: string | null;
  nominator_phone: string | null;
  nominee_name: string;
  nominee_name_normalized?: string | null;
  nominee_email: string | null;
  nominee_phone: string | null;
  nominee_instagram: string | null;
  category: ModelNominationCategory;
  reason: string;
  status: ModelNominationStatus;
  source: string;
  device_id?: string | null;
  device_fingerprint?: string | null;
  created_at: string;
  updated_at: string;
};

export function isModelNominationCategory(
  v: string
): v is ModelNominationCategory {
  return MODEL_NOMINATION_CATEGORIES.some((c) => c.value === v);
}

export function categoryLabel(category: ModelNominationCategory): string {
  return (
    MODEL_NOMINATION_CATEGORIES.find((c) => c.value === category)?.label ??
    category
  );
}

/** Lowercase + collapse whitespace for duplicate nominee checks. */
export function normalizeNomineeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
