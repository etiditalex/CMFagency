import { verify } from "otplib";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createAdminClient } from "@/supabase/server";

/**
 * Visitor account 2FA verification via TOTP (Google Authenticator).
 * Similar to admin `/api/fusion-xpress/verify-login-code`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(body.code ?? "").trim();
    const userId = String(body.user_id ?? "").trim();
    const method = String(body.method ?? "email").toLowerCase();

    if (!code) {
      return Response.json({ error: "Code is required" }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch user's 2FA settings
    const { data: totpRow } = await admin
      .from("visitor_user_totp")
      .select("secret, verified_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Visitor can only use TOTP for 2FA (email support can be added later)
    if (method === "totp") {
      if (!totpRow) {
        return Response.json({ error: "2FA is not enabled for this account" }, { status: 400 });
      }

      if (!totpRow.verified_at) {
        return Response.json({ error: "2FA setup is incomplete. Please verify first." }, { status: 400 });
      }

      // Validate TOTP code
      const isValid = verify({
        secret: totpRow.secret,
        token: code,
      });

      if (!isValid) {
        return Response.json({ error: "Invalid authentication code" }, { status: 401 });
      }

      // Set 2FA verified cookie (matches admin pattern)
      const response = NextResponse.json({
        success: true,
        message: "2FA verification successful",
      });

      response.cookies.set("visitor_2fa_verified", "1", {
        httpOnly: true,
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    // Additional 2FA methods (e.g., email) can be added here in future

    return Response.json({ error: "Invalid 2FA method" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[visitor 2FA verify]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
