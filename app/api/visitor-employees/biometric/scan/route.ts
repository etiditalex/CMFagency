import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Fingerprint attendance now confirms identity, then verifies a WebAuthn assertion. Use the reception terminal check-in flow.",
    },
    { status: 410 }
  );
}
