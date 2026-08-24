import { NextRequest, NextResponse } from "next/server";

import { clearSupabaseAuthCookies } from "@/lib/auth/session-cookies";

const COOKIE_NAME = "login_verified";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  clearSupabaseAuthCookies(req, res);
  return res;
}
