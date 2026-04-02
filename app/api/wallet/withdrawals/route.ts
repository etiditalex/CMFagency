import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  authenticateWalletRequest,
  getWalletSupabasePublicEnv,
  parseBearerToken,
} from "@/lib/wallet-request-auth";

/**
 * Lists withdrawal requests. Visibility is enforced by RLS (own rows, or admin/manager sees all).
 */
export async function GET(req: Request) {
  const env = getWalletSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authResult = await authenticateWalletRequest(req, env);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: (() => {
      const t = parseBearerToken(req);
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    })(),
  });

  try {
    const { data: rows, error } = await supabase
      .from("withdrawal_requests")
      .select(
        "id,amount,currency,recipient_phone,status,created_at,approved_at,created_by,metadata"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ withdrawals: rows ?? [] });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load withdrawals" },
      { status: 500 }
    );
  }
}
