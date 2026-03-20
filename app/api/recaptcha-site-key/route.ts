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

/** v3 shows the floating bottom-right badge; v2 uses the checkbox widget. Keys must match the type in Google Admin. */
function recaptchaVersionFromEnv(): "v2" | "v3" {
  const raw =
    process.env.NEXT_PUBLIC_RECAPTCHA_VERSION ??
    process.env.RECAPTCHA_VERSION ??
    "v2";
  const v = typeof raw === "string" ? raw.toLowerCase().trim() : "v2";
  return v === "v3" ? "v3" : "v2";
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
