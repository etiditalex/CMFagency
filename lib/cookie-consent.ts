export const COOKIE_CONSENT_KEY = "cookieConsent";
export const COOKIE_CONSENT_EVENT = "cookie-consent";

export type CookieConsent = "accepted" | "declined";

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === "accepted" || value === "declined" ? value : null;
}

export function writeCookieConsent(value: CookieConsent) {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}
