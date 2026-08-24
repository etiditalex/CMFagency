import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createRequestAuthClient } from "@/lib/auth/session-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getTokenFromCookies(req: NextRequest): Promise<string> {
  try {
    const supabase = createRequestAuthClient(req, () => undefined);
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token?.trim() || "";
  } catch {
    return "";
  }
}

export type AuthResult =
  | { authenticated: true; userId: string; token: string }
  | { authenticated: false; response: NextResponse };

/**
 * Require a valid Supabase session (Bearer token) for protected API routes.
 * Returns auth details or a 401 NextResponse.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() || (await getTokenFromCookies(req));

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 }),
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Server configuration error" }, { status: 500 }),
    };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }),
    };
  }

  return { authenticated: true, userId: user.id, token };
}

/**
 * Optional auth: get current user if present, otherwise null. Does not return 401.
 */
export async function getOptionalAuth(req: NextRequest): Promise<{ userId: string; token: string } | null> {
  const result = await requireAuth(req);
  if (result.authenticated) return { userId: result.userId, token: result.token };
  return null;
}
