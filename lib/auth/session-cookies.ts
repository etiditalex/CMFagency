import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

/** httpOnly + Secure (in production) + SameSite=Lax. Never readable from document.cookie. */
export function applyAuthCookieDefaults(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
  };
}

export function createRequestAuthClient(
  request: NextRequest,
  onCookies: (cookies: CookieToSet[], headers: Record<string, string>) => void
): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  return createServerClient(url, key, {
    cookieOptions: applyAuthCookieDefaults(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        onCookies(
          cookiesToSet.map(({ name, value, options }) => ({
            name,
            value,
            options: applyAuthCookieDefaults(options),
          })),
          headers
        );
      },
    },
  });
}

export function applyCookiesToResponse(
  response: NextResponse,
  cookies: CookieToSet[],
  headers?: Record<string, string>
) {
  for (const { name, value, options } of cookies) {
    const sameSiteRaw = options.sameSite;
    const sameSite =
      sameSiteRaw === true ? "strict" : sameSiteRaw === false ? "lax" : (sameSiteRaw ?? "lax");
    response.cookies.set(name, value, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite,
      path: options.path ?? "/",
      maxAge: options.maxAge,
      expires: options.expires,
    });
  }
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
}

export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-")) continue;
    response.cookies.set(cookie.name, "", {
      ...applyAuthCookieDefaults(),
      maxAge: 0,
    });
  }
}
