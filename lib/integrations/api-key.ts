import { createHash, randomBytes } from "crypto";

export const INTEGRATION_API_KEY_PREFIX = "fx_int_live_";

export const INTEGRATION_SCOPES = [
  "employees:read",
  "employees:write",
  "attendance:read",
  "leave:read",
  "leave:write",
  "register:read",
  "payroll:read",
  "payroll:write",
] as const;

export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number];

export function hashIntegrationApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim()).digest("hex");
}

export function generateIntegrationApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${INTEGRATION_API_KEY_PREFIX}${secret}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, 20),
    keyHash: hashIntegrationApiKey(rawKey),
  };
}

export function parseIntegrationBearerToken(authHeader: string | null): string | null {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token.startsWith(INTEGRATION_API_KEY_PREFIX)) return null;
  return token;
}

export function normalizeIntegrationScopes(raw: unknown): IntegrationScope[] {
  const allowed = new Set<string>(INTEGRATION_SCOPES);
  const list = Array.isArray(raw) ? raw.map((s) => String(s).trim()) : [];
  const scopes = list.filter((s): s is IntegrationScope => allowed.has(s));
  return scopes.length > 0 ? scopes : [...INTEGRATION_SCOPES];
}

export function hasIntegrationScope(scopes: string[], required: IntegrationScope): boolean {
  return scopes.includes(required);
}
