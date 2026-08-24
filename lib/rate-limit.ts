/**
 * In-memory rate limiter for login and auth-related endpoints.
 * In serverless, each instance has its own map; for multi-instance persistence use Redis (e.g. Upstash).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) store.delete(key);
  }
}

const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REGISTER_MAX_ATTEMPTS = 5;

/** Rate limit public employer self-registration by IP. */
export function checkEmployerRegisterRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  cleanup();
  const key = getKey(ip, "employer-register");
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= REGISTER_MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

function checkWindowedLimit(
  identifier: string,
  prefix: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  cleanup();
  const key = getKey(identifier, prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  return checkWindowedLimit(ip, "login", MAX_ATTEMPTS, WINDOW_MS);
}

/** Per-email cap so rotating IPs cannot brute-force one account. */
export function checkLoginEmailRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  return checkWindowedLimit(email.trim().toLowerCase(), "login-email", MAX_ATTEMPTS, WINDOW_MS);
}

/** Separate budget for 2FA code send/verify so it does not share the password lockout. */
export function checkLoginCodeRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  return checkWindowedLimit(ip, "login-code", 10, WINDOW_MS);
}

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_MAX_PER_IP = 10;
const PASSWORD_RESET_MAX_PER_EMAIL = 5;

/** Rate limit public password-reset requests by IP. */
export function checkPasswordResetIpRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  cleanup();
  const key = getKey(ip, "password-reset-ip");
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + PASSWORD_RESET_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + PASSWORD_RESET_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= PASSWORD_RESET_MAX_PER_IP) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

/** Rate limit public password-reset requests by email. */
export function checkPasswordResetEmailRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  cleanup();
  const key = getKey(email.toLowerCase(), "password-reset-email");
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + PASSWORD_RESET_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + PASSWORD_RESET_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= PASSWORD_RESET_MAX_PER_EMAIL) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) return realIp.trim();
  return "unknown";
}
