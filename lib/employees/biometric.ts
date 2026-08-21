import { createHash, randomBytes } from "crypto";

export const BIOMETRIC_TERMINAL_TOKEN_PREFIX = "FX-BIO-";
export const BIOMETRIC_DEVICE_STORAGE_KEY = "fx_employee_biometric_device_id";

/** Only the right thumb is used for employee fingerprint attendance. */
export const DEFAULT_BIOMETRIC_FINGER_INDEX = 1 as const;
export const DEFAULT_BIOMETRIC_FINGER_LABEL = "Right thumb";

export const BIOMETRIC_FINGERS = [
  { index: DEFAULT_BIOMETRIC_FINGER_INDEX, label: DEFAULT_BIOMETRIC_FINGER_LABEL },
] as const;

export type BiometricFingerIndex = (typeof BIOMETRIC_FINGERS)[number]["index"];

export type BiometricEnrollmentRecord = {
  id: string;
  ownerId: string;
  employeeId: string;
  fingerIndex: number;
  fingerLabel: string;
  status: "active" | "revoked";
  vendor: string;
  externalId: string | null;
  enrolledAt: string;
  lastMatchedAt: string | null;
  revokedAt: string | null;
};

export type BiometricTerminalRecord = {
  id: string;
  ownerId: string;
  name: string;
  terminalToken: string;
  status: "active" | "disabled";
};

export function fingerLabelForIndex(index: number): string {
  return BIOMETRIC_FINGERS.find((f) => f.index === index)?.label ?? DEFAULT_BIOMETRIC_FINGER_LABEL;
}

/** Always resolves to right thumb — other fingers are not used. */
export function parseFingerIndex(raw: unknown): BiometricFingerIndex {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (Number.isInteger(n) && n === DEFAULT_BIOMETRIC_FINGER_INDEX) {
    return DEFAULT_BIOMETRIC_FINGER_INDEX;
  }
  return DEFAULT_BIOMETRIC_FINGER_INDEX;
}

export function parseBiometricTerminalToken(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith(BIOMETRIC_TERMINAL_TOKEN_PREFIX)) return s.slice(0, 80);
  try {
    if (/^https?:\/\//i.test(s)) {
      const url = new URL(s);
      const fromQuery = url.searchParams.get("terminal")?.trim();
      if (fromQuery) return parseBiometricTerminalToken(fromQuery);
    }
  } catch {
    /* fall through */
  }
  const match = s.match(/FX-BIO-[A-Za-z0-9-]+/);
  return match ? match[0].slice(0, 80) : "";
}

export function createBiometricTerminalToken(): string {
  return `${BIOMETRIC_TERMINAL_TOKEN_PREFIX}${randomBytes(16).toString("hex")}`;
}

export function createBiometricTemplateMaterial(): {
  salt: string;
  hash: string;
} {
  const salt = randomBytes(16).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${secret}`).digest("hex");
  return { salt, hash };
}

export function biometricCheckPath(terminalToken: string, siteOrigin?: string): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = `/fusion-xpress/smart-visitor-management/biometric-check?terminal=${encodeURIComponent(terminalToken)}`;
  return base ? `${base}${path}` : path;
}

export function getOrCreateBiometricDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(BIOMETRIC_DEVICE_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `bio_${crypto.randomUUID()}`
        : `bio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(BIOMETRIC_DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    return `bio_${Date.now()}`;
  }
}

export function mapBiometricEnrollmentRow(row: {
  id: string;
  owner_id: string;
  employee_id: string;
  finger_index: number;
  finger_label: string;
  status: string;
  vendor: string;
  external_id: string | null;
  enrolled_at: string;
  last_matched_at: string | null;
  revoked_at: string | null;
}): BiometricEnrollmentRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    employeeId: row.employee_id,
    fingerIndex: row.finger_index,
    fingerLabel: row.finger_label,
    status: row.status === "revoked" ? "revoked" : "active",
    vendor: row.vendor || "fusion_pad",
    externalId: row.external_id,
    enrolledAt: row.enrolled_at,
    lastMatchedAt: row.last_matched_at,
    revokedAt: row.revoked_at,
  };
}

export function mapBiometricTerminalRow(row: {
  id: string;
  owner_id: string;
  name: string;
  terminal_token: string;
  status: string;
}): BiometricTerminalRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name || "Reception fingerprint terminal",
    terminalToken: row.terminal_token,
    status: row.status === "disabled" ? "disabled" : "active",
  };
}

export function isMissingBiometricTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg.includes("visitor_employee_biometric") ||
    msg.includes("biometric_enrollments") ||
    msg.includes("biometric_terminals") ||
    msg.includes("visitor_employee_webauthn") ||
    msg.includes("webauthn_credentials") ||
    msg.includes("webauthn_challenges") ||
    (msg.includes("does not exist") &&
      (msg.toLowerCase().includes("biometric") || msg.toLowerCase().includes("webauthn")))
  );
}

export const BIOMETRIC_SETUP_MESSAGE =
  "Biometric fingerprint module not set up. Run database/visitor_employees_patch_19_biometric_fingerprint.sql and database/visitor_employees_patch_20_webauthn_credentials.sql in Supabase.";

export const BIOMETRIC_NOT_REGISTERED_MESSAGE =
  "You are not yet registered. Kindly contact the administrator to add you to the attendance register.";
