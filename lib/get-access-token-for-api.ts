import { supabase } from "@/lib/supabase";

/**
 * JWT for Authorization: Bearer … on our Next.js API routes.
 * Refreshes the session when it is expired or close to expiry so
 * server-side `getUser(token)` does not reject with a stale access_token.
 */
export async function getAccessTokenForApi(): Promise<string | null> {
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
