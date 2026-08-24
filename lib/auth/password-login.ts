import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export class LoginRateLimitError extends Error {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "LoginRateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Password sign-in goes through /api/auth/login so attempts are rate-limited
 * and the session is stored in httpOnly cookies (not localStorage).
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ user: User; session: Session }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    retryAfter?: number;
    session?: Session;
  };

  if (res.status === 429) {
    throw new LoginRateLimitError(
      json.error || "Too many login attempts. Please try again later.",
      json.retryAfter
    );
  }
  if (!res.ok || !json.session?.access_token || !json.session.refresh_token) {
    throw new Error(json.error || "Invalid login credentials");
  }

  const { error } = await supabase.auth.setSession({
    access_token: json.session.access_token,
    refresh_token: json.session.refresh_token,
  });
  if (error) throw error;

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Session missing. Please try again.");
  return { user: data.session.user, session: data.session };
}
