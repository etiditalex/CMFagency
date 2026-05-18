import type { EmployeeMemberType } from "@/lib/employees/types";
import { memberTypeLabel } from "@/lib/employees/real-estate";

export const RECEPTION_GATE_TOKEN_PREFIX = "FX-EMP-GATE-";

export function isReceptionGateToken(raw: string | null | undefined): boolean {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .startsWith(RECEPTION_GATE_TOKEN_PREFIX);
}

export function parseReceptionGateToken(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/[?&]gate=([^&]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  const gateMatch = trimmed.match(/FX-EMP-GATE-[A-Za-z0-9]+/i);
  if (gateMatch) return gateMatch[0].toUpperCase();
  if (isReceptionGateToken(trimmed)) return trimmed.toUpperCase();
  return trimmed.slice(0, 128);
}

export function receptionGateCheckPath(gateToken: string): string {
  return `/fusion-xpress/smart-visitor-management/employee-check?gate=${encodeURIComponent(gateToken)}`;
}

export function receptionGateQrPayload(gateToken: string, siteOrigin?: string): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = receptionGateCheckPath(gateToken);
  return base ? `${base}${path}` : path;
}

export function receptionGateTitle(memberType: EmployeeMemberType): string {
  return `${memberTypeLabel(memberType)} — sign in`;
}
