/** Where business users must complete Google Authenticator setup before using the dashboard. */
export const BUSINESS_TOTP_SETUP_PATH = "/fusion-xpress/setup-authenticator";

/**
 * Business portal accounts (not internal admin/manager staff) must complete TOTP setup.
 * Email codes remain the default sign-in method; authenticator is an additional option.
 */
export function requiresMandatoryBusinessTotp(
  role: string | null | undefined,
  accountType?: string | null | undefined
): boolean {
  const r = String(role ?? "").toLowerCase();
  const at = String(accountType ?? "").toLowerCase();
  if (r === "admin" || r === "manager") return false;
  if (r === "employer" || r === "client") return true;
  if (at === "visitor_management" || at === "employer") return true;
  return false;
}

export function businessTotpSetupUrl(redirectTo?: string): string {
  if (!redirectTo?.trim()) return BUSINESS_TOTP_SETUP_PATH;
  return `${BUSINESS_TOTP_SETUP_PATH}?redirect=${encodeURIComponent(redirectTo.trim())}`;
}
