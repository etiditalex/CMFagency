import { NextResponse } from "next/server";

/**
 * Returns the reCAPTCHA site key at runtime so the login page can show the widget
 * without relying on NEXT_PUBLIC_* build-time inlining (which can fail with cached builds).
 * The site key is public by design — safe to expose.
 */
export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  return NextResponse.json({ siteKey }, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
