import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signingSecret(): string | null {
  const secret =
    process.env.ATTENDANCE_REGISTER_TOKEN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret || null;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAttendanceRegisterDownloadToken(ownerId: string, dayKey: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${ownerId}|${dayKey}|${expiresAt}`;
  const signature = signPayload(payload, secret);
  return `${base64UrlEncode(payload)}.${signature}`;
}

export function verifyAttendanceRegisterDownloadToken(
  token: string
): { ownerId: string; dayKey: string } | null {
  const secret = signingSecret();
  if (!secret) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  let payload: string;
  try {
    payload = base64UrlDecode(encodedPayload);
  } catch {
    return null;
  }

  const expected = signPayload(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const [ownerId, dayKey, expiresRaw] = payload.split("|");
  const expiresAt = Number(expiresRaw);
  if (!ownerId || !dayKey || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return { ownerId, dayKey };
}

export function attendanceRegisterDownloadUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  return `${base}/api/public/attendance-register/download?token=${encodeURIComponent(token)}`;
}
