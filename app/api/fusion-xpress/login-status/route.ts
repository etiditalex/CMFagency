import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "portal_2fa_verified";

export async function GET(req: NextRequest) {
  try {
    const verified = req.cookies.get(COOKIE_NAME)?.value === "1";
    return NextResponse.json({ verified });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
