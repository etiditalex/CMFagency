import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getWalletSupabasePublicEnv, parseBearerToken } from "@/lib/wallet-request-auth";

/**
 * Lists withdrawal requests. Clients see own; admins see all.
 */
async function getAuthenticatedUser(
  req: Request,
  env: { supabaseUrl: string; supabaseAnonKey: string }
): Promise<{ id: string; isAdmin: boolean } | null> {
  const token = parseBearerToken(req);
  if (!token) return null;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: pm } = await supabase.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
  const isAdmin = pm?.role === "admin";
  const isPortal = !!pm;
  const { data: au } = !isPortal ? await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  if (!pm && !au) return null;

  return { id: user.id, isAdmin: isAdmin || !!au };
}

export async function GET(req: Request) {
  const env = getWalletSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const auth = await getAuthenticatedUser(req, env);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: (() => {
      const t = parseBearerToken(req);
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    })(),
  });

  try {
    const selectFields = auth.isAdmin
      ? "id,amount,currency,recipient_phone,status,created_at,approved_at,created_by,metadata"
      : "id,amount,currency,recipient_phone,status,created_at,approved_at,metadata";

    let query = supabase
      .from("withdrawal_requests")
      .select(selectFields)
      .order("created_at", { ascending: false });

    if (!auth.isAdmin) {
      query = query.eq("created_by", auth.id);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    return NextResponse.json({ withdrawals: rows ?? [] });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load withdrawals" },
      { status: 500 }
    );
  }
}
