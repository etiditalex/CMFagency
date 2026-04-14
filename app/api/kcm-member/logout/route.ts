import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KCM_MEMBER_COOKIE, getKcmAdminClient } from "@/lib/kcm-member-auth";

export async function POST() {
  try {
    const token = (await cookies()).get(KCM_MEMBER_COOKIE)?.value ?? "";
    const admin = getKcmAdminClient();
    if (token && admin) {
      await admin.from("kcm_member_sessions").delete().eq("session_token", token);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(KCM_MEMBER_COOKIE, "", {
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
