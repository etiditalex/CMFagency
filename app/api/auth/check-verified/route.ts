import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "login_verified";

export async function GET(req: NextRequest) {
  const verified = req.cookies.get(COOKIE_NAME)?.value === "1";
  return NextResponse.json({ verified });
}
