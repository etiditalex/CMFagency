import type { PortalFeature } from "@/contexts/PortalContext";

const PORTAL_FEATURE_KEYS = new Set<PortalFeature>([
  "payouts",
  "coupons",
  "managers",
  "email",
  "create_campaign",
  "ticketing",
  "voting",
  "reports",
  "events",
  "applications",
  "kcm_membership",
  "teams_work",
  "kcm_payouts_inflow",
  "visitor_management",
]);

export function parsePortalFeatures(raw: unknown): PortalFeature[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => String(f).toLowerCase().trim())
    .filter((f): f is PortalFeature => PORTAL_FEATURE_KEYS.has(f as PortalFeature));
}

/** Client accounts scoped to Smart Visitor Management only (no ticketing, voting, etc.). */
export function isVisitorOnlyPortalUser(
  role: string | null,
  features: PortalFeature[],
  isAdmin: boolean
): boolean {
  if (isAdmin) return false;
  if (role !== "client") return false;
  return features.length === 1 && features[0] === "visitor_management";
}

export function hasVisitorManagementAccess(
  role: string | null,
  features: PortalFeature[],
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (role === "employer") return false;
  return features.includes("visitor_management");
}

export const VISITOR_ONLY_DASHBOARD_PREFIX = "/dashboard/visitor-management";

export function isVisitorOnlyAllowedDashboardPath(pathname: string): boolean {
  if (pathname === VISITOR_ONLY_DASHBOARD_PREFIX || pathname.startsWith(`${VISITOR_ONLY_DASHBOARD_PREFIX}/`)) {
    return true;
  }
  if (pathname === "/dashboard/account") return true;
  return false;
}
