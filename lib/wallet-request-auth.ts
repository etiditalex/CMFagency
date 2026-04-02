/** Shared helpers for /api/wallet/* routes (Bearer JWT + public Supabase env). */

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
