import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Digital Asset Links for the Play Store TWA.
 * Leave ANDROID_TWA_SHA256_CERT_FINGERPRINTS unset until the release keystore is reviewed —
 * an empty list means Chrome will not verify the app (Custom Tabs with a URL bar).
 */
export async function GET() {
  const packageName =
    process.env.ANDROID_TWA_PACKAGE_NAME?.trim() || "ke.co.cmfagency.shell";
  const fingerprints = (process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
