import { NextRequest, NextResponse } from "next/server";

import { sendNewsletterWelcomeEmail } from "@/lib/send-newsletter-welcome-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const raw = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email : "";
  const email = raw.trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const result = await sendNewsletterWelcomeEmail({ to: email });

  if (!result.ok) {
    const isConfig = result.error.includes("RESEND_API_KEY");
    return NextResponse.json(
      {
        ok: false,
        error: isConfig
          ? "Newsletter signup is temporarily unavailable. Please try again later."
          : "We couldn’t send your confirmation email. Please try again in a few minutes.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
