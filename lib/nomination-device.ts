/** Client-side persistent device id for nomination anti-abuse. */

const STORAGE_KEY = "cmfa_nominate_device_id";
const COOKIE_NAME = "cmfa_nominate_device";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400; // ~13 months

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Returns a stable device id, creating and persisting one if needed. */
export function getOrCreateNominationDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = "";
  try {
    id = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    id = "";
  }

  if (!id) {
    id = readCookie(COOKIE_NAME)?.trim() ?? "";
  }

  if (!id) {
    id = newId();
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore quota / private mode
  }
  writeCookie(COOKIE_NAME, id);

  return id;
}
