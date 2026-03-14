import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory store for rate limiting (per-instance; use Redis in production for multi-instance)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10; // per IP for /login and login API routes

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp.trim();
  return "unknown";
}

function isLoginRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/send-login-verification-code") ||
    pathname.startsWith("/api/verify-login-verification-code")
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

// Only increment counter for POST requests to login APIs (actual login attempts)
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method === "POST" && isLoginRoute(pathname)) {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 900) } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/api/send-login-verification-code", "/api/verify-login-verification-code"],
};
