import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const KCM_MEMBER_COOKIE = "kcm_member_session";
export const KCM_SESSION_DAYS = 14;

export function getKcmAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getKcmMemberSession() {
  const token = (await cookies()).get(KCM_MEMBER_COOKIE)?.value ?? "";
  if (!token) return null;
  const admin = getKcmAdminClient();
  if (!admin) return null;

  const { data: row, error } = await admin
    .from("kcm_member_sessions")
    .select("membership_id,email,expires_at")
    .eq("session_token", token)
    .maybeSingle();
  if (error || !row) return null;

  const expires = new Date(String((row as { expires_at?: string }).expires_at ?? ""));
  if (!Number.isFinite(expires.getTime()) || expires <= new Date()) return null;

  return {
    token,
    membershipId: String((row as { membership_id: string }).membership_id),
    email: String((row as { email: string }).email),
    expiresAt: expires.toISOString(),
  };
}
