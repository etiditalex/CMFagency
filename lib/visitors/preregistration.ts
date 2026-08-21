export const VISITOR_GATE_TOKEN_PREFIX = "FX-VIS-GATE-";

export function visitorGateTokenForOwner(ownerId: string): string {
  const compact = ownerId.replace(/-/g, "").trim().toUpperCase();
  return `${VISITOR_GATE_TOKEN_PREFIX}${compact}`;
}

export function isVisitorGateToken(raw: string | null | undefined): boolean {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .startsWith(VISITOR_GATE_TOKEN_PREFIX);
}

export function parseVisitorGateToken(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/[?&]gate=([^&]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  const gateMatch = trimmed.match(/FX-VIS-GATE-[A-Za-z0-9]+/i);
  if (gateMatch) return gateMatch[0].toUpperCase();
  if (isVisitorGateToken(trimmed)) return trimmed.toUpperCase();
  return "";
}

export function parseVisitorPassToken(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/[?&]token=([^&]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  if (trimmed.toUpperCase().startsWith("FX-VIS-") && !isVisitorGateToken(trimmed)) {
    return trimmed;
  }
  return trimmed.slice(0, 128);
}

export function ownerIdFromVisitorGateToken(gateToken: string): string | null {
  const raw = parseVisitorGateToken(gateToken);
  if (!raw) return null;
  const compact = raw.slice(VISITOR_GATE_TOKEN_PREFIX.length).toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) return null;
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export function industryPreRegisterPath(industrySlug: string, ownerId: string): string {
  const qs = new URLSearchParams({ owner: ownerId.trim() });
  return `/fusion-xpress/smart-visitor-management/pre-register/${encodeURIComponent(industrySlug)}?${qs.toString()}`;
}

export function industryPreRegisterUrl(
  industrySlug: string,
  ownerId: string,
  siteOrigin?: string
): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = industryPreRegisterPath(industrySlug, ownerId);
  return base ? `${base}${path}` : path;
}

export function visitorArrivalCheckPath(params: { gate?: string; token?: string }): string {
  const qs = new URLSearchParams();
  if (params.gate) qs.set("gate", params.gate);
  if (params.token) qs.set("token", params.token);
  const query = qs.toString();
  return `/fusion-xpress/smart-visitor-management/visitor-check${query ? `?${query}` : ""}`;
}

export function visitorArrivalQrPayload(params: {
  gate?: string;
  token?: string;
  siteOrigin?: string;
}): string {
  const base = (params.siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = visitorArrivalCheckPath({ gate: params.gate, token: params.token });
  return base ? `${base}${path}` : path;
}

export function isPreregisterVisitor(source: string | null | undefined, formExtra?: Record<string, unknown> | null) {
  if (String(source ?? "").toLowerCase() === "preregister") return true;
  return formExtra?.preregister === true || formExtra?.preregister === "true";
}
