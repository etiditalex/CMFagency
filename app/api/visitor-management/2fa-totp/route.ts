import { generateSecret, generateURI } from "otplib";
import type { NextRequest } from "next/server";

import { createAdminClient } from "@/supabase/server";

/**
 * Check if visitor has 2FA enabled and which method.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get("user_id");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: totpRow } = await admin
      .from("visitor_user_totp")
      .select("verified_at")
      .eq("user_id", userId)
      .maybeSingle();

    return Response.json({
      hasTotp: !!totpRow?.verified_at,
      methods: ["totp"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    console.error("[visitor 2fa method check]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Setup TOTP for visitor account (generates secret + QR).
 * Must be verified with a 6-digit code before activation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = String(body.user_id ?? "").trim();
    const action = String(body.action ?? "generate").toLowerCase();

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (action === "generate") {
      // Generate new secret + QR URI for setup
      const secret = generateSecret({ length: 32 });
      const uri = generateURI({
        secret,
        label: `Visitor Management (${userId})`,
        issuer: "CMF Agency",
        algorithm: "sha1",
      });

      // Store temporary secret (unverified)
      const { error } = await admin
        .from("visitor_user_totp")
        .upsert(
          {
            user_id: userId,
            secret,
            verified_at: null,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      return Response.json({
        secret,
        qr_uri: uri,
        message: "Scan QR with Google Authenticator, then verify with 6-digit code",
      });
    }

    if (action === "verify") {
      // Verify 6-digit code and mark 2FA as active
      const { verify: verifyOtp } = await import("otplib");
      const code = String(body.code ?? "").trim();

      if (!code) {
        return Response.json({ error: "6-digit code is required" }, { status: 400 });
      }

      const { data: totpRow } = await admin
        .from("visitor_user_totp")
        .select("secret")
        .eq("user_id", userId)
        .maybeSingle();

      if (!totpRow) {
        return Response.json({ error: "No 2FA setup found. Please generate first." }, { status: 400 });
      }

      const isValid = verifyOtp({
        secret: totpRow.secret,
        token: code,
      });

      if (!isValid) {
        return Response.json({ error: "Invalid code. Try again." }, { status: 401 });
      }

      // Mark as verified
      const { error: updateErr } = await admin
        .from("visitor_user_totp")
        .update({ verified_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateErr) throw updateErr;

      return Response.json({
        success: true,
        message: "2FA enabled successfully",
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Setup failed";
    console.error("[visitor 2fa setup]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
