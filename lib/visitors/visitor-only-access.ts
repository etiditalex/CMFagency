import type { PortalFeature } from "@/contexts/PortalContext";
import { VISITOR_MANAGEMENT_ACCOUNTS_PATH } from "@/lib/visitors/industry-options";

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
  "poll_account",
  "employer_account",
]);

const SERVICE_FEATURE_KEYS = new Set<PortalFeature>(["visitor_management", "poll_account", "employer_account"]);

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

export function hasPollService(role: string | null, features: readonly string[]): boolean {
  return role === "poll" || features.includes("poll_account");
}

export function hasEmployerService(role: string | null, features: readonly string[]): boolean {
  return role === "employer" || features.includes("employer_account");
}

/** Poll role with no other service attached. */
export function isExclusivePollAccount(role: string | null, features: readonly string[]): boolean {
  return role === "poll" && !features.includes("visitor_management") && !features.includes("employer_account");
}

/** Account whose modules are only self-serve services (poll, visitor, employer). */
export function isServiceScopedAccount(
  role: string | null,
  features: readonly string[],
  isAdmin: boolean
): boolean {
  if (isAdmin || role === "admin" || role === "manager") return false;
  if (features.some((feature) => !SERVICE_FEATURE_KEYS.has(feature as PortalFeature))) return false;
  return hasPollService(role, features) || hasEmployerService(role, features) || features.includes("visitor_management");
}

export function hasVisitorManagementAccess(
  _role: string | null,
  features: PortalFeature[],
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  return features.includes("visitor_management");
}

export const VISITOR_ONLY_DASHBOARD_PREFIX = "/dashboard/visitor-management";

export function isVisitorOnlyAllowedDashboardPath(pathname: string): boolean {
  if (
    pathname === VISITOR_MANAGEMENT_ACCOUNTS_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_ACCOUNTS_PATH}/`)
  ) {
    return false;
  }
  if (pathname === VISITOR_ONLY_DASHBOARD_PREFIX || pathname.startsWith(`${VISITOR_ONLY_DASHBOARD_PREFIX}/`)) {
    return true;
  }
  if (pathname === "/dashboard/account") return true;
  return false;
}
