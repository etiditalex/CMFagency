import { NextRequest, NextResponse } from "next/server";

import {
  applyCookiesToResponse,
  createRequestAuthClient,
  type CookieToSet,
} from "@/lib/auth/session-cookies";
import { checkLoginEmailRateLimit, checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Server-side password login.
 *
 * Passwords are verified by Supabase Auth (GoTrue), which stores them as bcrypt
 * hashes in auth.users — this app never persists plaintext passwords.
 * Failed and successful attempts are rate-limited by IP and email to block brute force.
 * The resulting session is written as httpOnly + Secure cookies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !email.includes("@") || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipLimit = checkLoginRateLimit(ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", retryAfter: ipLimit.retryAfter },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter ?? 900) } }
      );
    }

    const emailLimit = checkLoginEmailRateLimit(email);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", retryAfter: emailLimit.retryAfter },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfter ?? 900) } }
      );
    }

    const cookiesToSet: CookieToSet[] = [];
    let extraHeaders: Record<string, string> = {};
    const supabase = createRequestAuthClient(req, (cookies, headers) => {
      cookiesToSet.push(...cookies);
      extraHeaders = { ...extraHeaders, ...headers };
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      const response = NextResponse.json(
        { error: error?.message || "Invalid login credentials" },
        { status: 401 }
      );
      applyCookiesToResponse(response, cookiesToSet, extraHeaders);
      return response;
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });
    applyCookiesToResponse(response, cookiesToSet, extraHeaders);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
