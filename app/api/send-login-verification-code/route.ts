import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";

const CODE_EXPIRY_MINUTES = 10;

async function verifyRecaptchaResponse(
  secretKey: string,
  recaptchaToken: string,
  ip: string
): Promise<NextResponse | null> {
  const verifyParams = new URLSearchParams({
    secret: secretKey,
    response: recaptchaToken,
  });
  if (ip && ip !== "unknown") {
    verifyParams.set("remoteip", ip);
  }
  const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  const verifyData = (await verifyRes.json().catch(() => ({}))) as {
    success?: boolean;
    score?: number;
    action?: string;
  };
  if (!verifyData?.success) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }
  if (typeof verifyData.score === "number") {
    const minRaw = process.env.RECAPTCHA_MIN_SCORE ?? "0.5";
    const min = Number.parseFloat(minRaw);
    const threshold = Number.isFinite(min) ? min : 0.5;
    if (verifyData.score < threshold) {
      return NextResponse.json(
        { error: "Security verification could not be completed. Please try again." },
        { status: 400 }
      );
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkLoginRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 900) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { recaptchaToken?: string | null };

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey)
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    if (!resendApiKey)
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = userData.user.id;
    const email = userData.user.email;
    const name = userData.user.user_metadata?.name || email?.split("@")[0] || "User";
    if (!email) return NextResponse.json({ error: "User has no email" }, { status: 400 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: existingCode } = await admin
      .from("site_login_codes")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const isResend = !!existingCode;

    // First code send after password: no client CAPTCHA (same idea as Fusion Xpress send-login-code).
    // When RECAPTCHA_SECRET_KEY is set, resend requests must pass a verified token to limit email abuse.
    const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
    const recaptchaToken = typeof body?.recaptchaToken === "string" ? body.recaptchaToken.trim() : "";
    if (secretKey) {
      if (isResend) {
        if (!recaptchaToken) {
          return NextResponse.json(
            {
              error:
                "CAPTCHA verification required. Complete the security check on this page, then tap Resend code again.",
            },
            { status: 400 }
          );
        }
        const capErr = await verifyRecaptchaResponse(secretKey, recaptchaToken, ip);
        if (capErr) return capErr;
      } else if (recaptchaToken) {
        const capErr = await verifyRecaptchaResponse(secretKey, recaptchaToken, ip);
        if (capErr) return capErr;
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await admin.from("site_login_codes").delete().eq("user_id", userId);
    const { error: insertErr } = await admin.from("site_login_codes").insert({
      user_id: userId,
      code,
      expires_at: expiresAt.toISOString(),
    });
    if (insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">CMF Agency</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Your login verification code</h2>
          <p>Hello ${name},</p>
          <p>You signed in to your account. Enter this code to continue:</p>
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827; margin: 0; font-family: monospace;">${code}</p>
          </div>
          <p style="color: #6b7280;">This code expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request it, secure your account.</p>
          <p style="color: #6b7280; font-size: 12px;">CMF Agency / Changer Fusions</p>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "Your CMF Agency login code",
        html: emailHtml,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errBody.message ?? errBody.error ?? "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
