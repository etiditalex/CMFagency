export type ContestantTitle = "mr" | "miss";
export type ContestantCategory = "kids" | "teens" | "adults";

export type ContestantCardData = {
  applicationCode: string;
  fullName: string;
  applyingAs: ContestantTitle;
  category: ContestantCategory;
  townCounty: string;
  issuedOn: string;
};

export const IDEAL_EVENT_VENUE = "Malaika Lounge, Malindi";
export const IDEAL_EVENT_DATE_LABEL = "12 Dec 2026";
export const IDEAL_APPLICATION_FEE_DEFAULT_KES = 500;
const IDEAL_FEE_MIN_KES = 1;
const IDEAL_FEE_MAX_KES = 1_000_000;

export function clampIdealApplicationFeeKes(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return IDEAL_APPLICATION_FEE_DEFAULT_KES;
  return Math.min(IDEAL_FEE_MAX_KES, Math.max(IDEAL_FEE_MIN_KES, Math.floor(n)));
}

export function formatIdealFeeKes(amount: number): string {
  return `KES ${clampIdealApplicationFeeKes(amount).toLocaleString("en-KE")}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeApplicationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let body = "";
  for (const byte of bytes) body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `KIM-${body}`;
}

export function titleLabel(value: ContestantTitle): string {
  return value === "mr" ? "Mr" : "Miss";
}

export function categoryLabel(value: ContestantCategory): string {
  if (value === "kids") return "Kids, 7–12 years";
  if (value === "teens") return "Teens, 13–17 years";
  return "Adults, 18–25 years";
}

export function formatIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function contestantCardPath(code: string): string {
  return `/events/registration/card/${encodeURIComponent(code)}`;
}
