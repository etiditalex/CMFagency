import { NextResponse } from "next/server";

/**
 * Returns the reCAPTCHA site key at runtime so the login page can show the widget
 * without relying on NEXT_PUBLIC_* build-time inlining (which can fail with cached builds).
 * Uses RECAPTCHA_SITE_KEY or NEXT_PUBLIC_RECAPTCHA_SITE_KEY (Vercel often uses the shorter name for the public key).
 * The site key is public by design — safe to expose.
 */
function siteKeyFromEnv(): string {
  const raw =
    process.env.RECAPTCHA_SITE_KEY ??
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ??
    "";
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * v3 = score-based keys (floating badge + execute). v2 = "I'm not a robot" checkbox.
 * Default is v3 so production works with typical new Google registrations without an extra env var.
 * Use v2 keys in Admin → set NEXT_PUBLIC_RECAPTCHA_VERSION=v2 (or RECAPTCHA_VERSION=v2).
 */
function recaptchaVersionFromEnv(): "v2" | "v3" {
  const raw =
    process.env.NEXT_PUBLIC_RECAPTCHA_VERSION ??
    process.env.RECAPTCHA_VERSION ??
    process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_VERSION ??
    process.env.GOOGLE_RECAPTCHA_VERSION ??
    process.env.NEXT_PUBLIC_RECAPTCHA_V3 ??
    process.env.RECAPTCHA_V3;

  if (raw === undefined || raw === null) return "v3";

  const s = String(raw).trim().toLowerCase();
  if (!s) return "v3";

  if (
    s === "v3" ||
    s === "3" ||
    s === "score" ||
    s === "v3_score" ||
    s === "true" ||
    s === "yes" ||
    s === "1" ||
    s === "on"
  ) {
    return "v3";
  }

  if (s === "v2" || s === "2" || s === "checkbox" || s === "false" || s === "no" || s === "0" || s === "off") {
    return "v2";
  }

  return "v3";
}

export async function GET() {
  const siteKey = siteKeyFromEnv();
  const version = recaptchaVersionFromEnv();
  return NextResponse.json({ siteKey, version }, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
