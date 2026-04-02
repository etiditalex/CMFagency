import { supabase } from "@/lib/supabase";

/**
 * JWT for Authorization: Bearer … on our Next.js API routes.
 * Validates the user with `getUser()` first (may refresh internally), then refreshes when
 * the access token is expired or near expiry so server-side `getUser(token)` accepts it.
 */
export async function getAccessTokenForApi(): Promise<string | null> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
    if (refErr || !refreshed.session?.access_token) return null;
    return refreshed.session.access_token;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) return null;

  const exp = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp != null && exp <= nowSec + 120) {
    const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
    if (!refErr && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}
