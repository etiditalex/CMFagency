import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import {
  checkPasswordResetEmailRateLimit,
  checkPasswordResetIpRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

/**
 * Send a portal password-reset email via Resend.
 * Bypasses Supabase Auth SMTP (which returns "Error sending recovery email" when misconfigured).
 * Uses admin.generateLink so the recovery token is still issued by Supabase Auth.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = checkPasswordResetIpRateLimit(ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter ?? 3600) } }
      );
    }

    const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const emailLimit = checkPasswordResetEmailRateLimit(email);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts for this email. Please try again later." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfter ?? 3600) } }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (!resendApiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const origin = (req.headers.get("origin") || SITE_URL).replace(/\/$/, "");
    const redirectTo = `${origin}/fusion-xpress/reset-password`;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Do not reveal whether the account exists.
    if (linkErr || !linkData?.properties?.action_link) {
      const msg = String(linkErr?.message ?? "").toLowerCase();
      if (
        msg.includes("not found") ||
        msg.includes("unable to find") ||
        msg.includes("no user") ||
        msg.includes("user not found")
      ) {
        return NextResponse.json({ ok: true });
      }
      if (linkErr) {
        console.error("generateLink recovery failed:", linkErr.message);
        return NextResponse.json(
          { error: "Unable to create password reset link. Please try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    const actionLink = linkData.properties.action_link;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Password recovery" })}
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
          <p>We received a request to reset the password for your business portal account.</p>
          <p style="margin: 24px 0;">
            <a href="${actionLink}" style="display: inline-block; background: #1a4f8c; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 20px; border-radius: 8px;">
              Set a new password
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">This link expires soon and can only be used once. If you did not request a reset, you can ignore this email.</p>
          <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">If the button does not work, open this link:<br/>${actionLink}</p>
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
        subject: "Reset your Fusion Xpress password",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      console.error("Resend password reset failed:", errBody);
      return NextResponse.json(
        { error: errBody.message ?? errBody.error ?? "Failed to send reset email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
