import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_FEATURES = [
  "payouts",
  "coupons",
  "managers",
  "email",
  "create_campaign",
  "ticketing",
  "voting",
  "reports",
  "events",
  "applications",
  "kcm_membership",
  "teams_work",
  "kcm_payouts_inflow",
  "visitor_management",
] as const;

type Body = {
  access_token?: string;
  role?: "admin" | "manager" | "client";
  tier?: "basic" | "pro" | "enterprise";
  features?: string[];
};

/**
 * PATCH: Update a portal member's role, tier, and features (full admin only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = (await req.json()) as Body;
    const accessToken = String(body.access_token ?? "").trim();
    const role = body.role as "admin" | "manager" | "client" | undefined;
    const tier = body.tier as "basic" | "pro" | "enterprise" | undefined;
    const rawFeatures = Array.isArray(body.features) ? body.features : undefined;

    if (!accessToken) return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(accessToken);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;

    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: full admin access required" }, { status: 403 });
    }

    // Prevent editing self's role (safety)
    if (userId === callerId && role && role !== memberRow?.role) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const { data: existing } = await admin.from("portal_members").select("role,tier,features").eq("user_id", userId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "User not found in portal" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    const newRole = role ?? existing.role;

    if (role !== undefined) {
      if (!["admin", "manager", "client"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }
    updates.tier =
      newRole === "admin" || newRole === "manager"
        ? "enterprise"
        : tier !== undefined
          ? tier
          : (existing.tier as string);
    updates.features =
      newRole === "admin" || newRole === "manager"
        ? []
        : rawFeatures !== undefined
          ? rawFeatures
              .map((f) => String(f).toLowerCase().trim())
              .filter((f) => ALLOWED_FEATURES.includes(f as (typeof ALLOWED_FEATURES)[number]))
          : (existing.features as string[] ?? []);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, message: "No changes" });
    }

    const { error: updateErr } = await admin
      .from("portal_members")
      .update(updates)
      .eq("user_id", userId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    if (role === "admin" && existing.role !== "admin") {
      await admin.from("admin_users").upsert({ user_id: userId }, { onConflict: "user_id" });
    } else if (role !== "admin" && existing.role === "admin") {
      await admin.from("admin_users").delete().eq("user_id", userId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE: Remove a portal member and their auth account (full admin only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerId = String(callerData.user.id ?? "");
    const { data: callerMember } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    const isFullAdmin = callerMember?.role === "admin";
    const isLegacyAdmin = !callerMember
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;

    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: full admin access required" }, { status: 403 });
    }

    if (userId === callerId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const { data: target } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "User not found in portal" }, { status: 404 });
    }

    if (target.role === "admin") {
      return NextResponse.json({ error: "Cannot delete an admin account from here" }, { status: 400 });
    }

    await admin.from("visitors").delete().eq("owner_id", userId);
    await admin.from("portal_login_codes").delete().eq("user_id", userId);
    await admin.from("portal_user_totp").delete().eq("user_id", userId);
    await admin.from("portal_members").delete().eq("user_id", userId);
    await admin.from("admin_users").delete().eq("user_id", userId);

    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthErr) {
      return NextResponse.json({ error: deleteAuthErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
