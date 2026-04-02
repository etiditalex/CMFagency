/** Shared helpers for /api/wallet/* routes (Bearer JWT + public Supabase env). */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getWalletSupabasePublicEnv(): { supabaseUrl: string; supabaseAnonKey: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) return null;
  return { supabaseUrl, supabaseAnonKey };
}

/** Extract JWT from Authorization header (trimmed). */
export function parseBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization")?.trim();
  if (!raw) return null;
  if (!/^Bearer\s+/i.test(raw)) return null;
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export type WalletAuthSuccess = {
  userId: string;
  accessToken: string;
  supabaseAsUser: SupabaseClient;
  /** Present when user has a portal_members row. */
  portal: { role: string | null; features: string[] | null } | null;
  /** True when user is in admin_users and has no portal_members row (legacy). */
  legacyAdmin: boolean;
};

export type WalletAuthResult =
  | { ok: true; auth: WalletAuthSuccess }
  | { ok: false; status: 401; error: string };

/**
 * Verify Bearer JWT with the anon key, then resolve portal membership.
 * When SUPABASE_SERVICE_ROLE_KEY is set, membership is read with the service role so RLS
 * cannot hide portal_members/admin_users rows from the route handler.
 */
export async function authenticateWalletRequest(
  req: Request,
  env: { supabaseUrl: string; supabaseAnonKey: string }
): Promise<WalletAuthResult> {
  const accessToken = parseBearerToken(req);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabaseAsUser = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authErr } = await supabaseAsUser.auth.getUser(accessToken);
  if (authErr || !authData?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const userId = authData.user.id;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  let pm: { role?: string | null; features?: unknown } | null = null;
  let legacyAdmin = false;

  if (serviceKey) {
    const admin = createClient(env.supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: pmRow } = await admin
      .from("portal_members")
      .select("role,features")
      .eq("user_id", userId)
      .maybeSingle();
    pm = pmRow;
    if (!pmRow) {
      const { data: auRow } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
      legacyAdmin = !!auRow;
    }
  } else {
    const { data: pmRow } = await supabaseAsUser
      .from("portal_members")
      .select("role,features")
      .eq("user_id", userId)
      .maybeSingle();
    pm = pmRow;
    if (!pmRow) {
      const { data: auRow } = await supabaseAsUser
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      legacyAdmin = !!auRow;
    }
  }

  if (!pm && !legacyAdmin) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const role = pm ? String(pm.role ?? "client").toLowerCase() : null;
  const features = Array.isArray(pm?.features) ? (pm.features as string[]) : null;

  return {
    ok: true,
    auth: {
      userId,
      accessToken,
      supabaseAsUser,
      portal: pm ? { role, features } : null,
      legacyAdmin,
    },
  };
}

/** Portal role admin, or legacy admin_users-only (approve route uses service role for updates). */
export function canApproveWalletWithdrawals(auth: WalletAuthSuccess): boolean {
  if (auth.legacyAdmin && !auth.portal) {
    return true;
  }
  return auth.portal?.role === "admin";
}

/** Withdraw POST: admins/managers/legacy or clients with payouts feature. */
export function canRequestWalletWithdrawal(auth: WalletAuthSuccess): boolean {
  const role = auth.portal?.role ?? "";
  if (auth.legacyAdmin && !auth.portal) {
    return true;
  }
  if (role === "admin" || role === "manager") {
    return true;
  }
  const features = auth.portal?.features ?? [];
  return features.includes("payouts");
}
