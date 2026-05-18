import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendVisitorLoginCodeEmail } from "@/lib/visitors/send-visitor-login-code";
import { isVisitorIndustrySlug } from "@/lib/visitors/industry-options";
import { checkEmployerRegisterRateLimit, getClientIp } from "@/lib/rate-limit";
import { ensureVisitorTrialSubscription } from "@/lib/visitors/subscription-db";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkEmployerRegisterRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const businessName = String(body.businessName ?? body.business_name ?? "").trim();
    const contactName = String(body.contactName ?? body.contact_name ?? body.yourName ?? "").trim();
    const country = String(body.country ?? "").trim();
    const addressLine1 = String(body.addressLine1 ?? body.address_line_1 ?? "").trim();
    const addressLine2 = String(body.addressLine2 ?? body.address_line_2 ?? "").trim();
    const suburb = String(body.suburb ?? body.city ?? "").trim();
    const state = String(body.state ?? "").trim();
    const postcode = String(body.postcode ?? "").trim();
    const website = String(body.website ?? "").trim();
    const organizationIndustry = String(
      body.organizationIndustry ?? body.organization_industry ?? ""
    ).trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!businessName) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: "Your name is required" }, { status: 400 });
    }
    if (!country || !addressLine1 || !suburb || !state || !postcode) {
      return NextResponse.json({ error: "Complete your business address to continue" }, { status: 400 });
    }
    if (!organizationIndustry || !isVisitorIndustrySlug(organizationIndustry)) {
      return NextResponse.json({ error: "Select your organization industry" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        name: contactName,
        business_name: businessName,
        account_type: "visitor_management",
        organization_industry: organizationIndustry,
        country,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        suburb,
        state,
        postcode,
        website,
      },
    });

    if (createErr || !created?.user?.id) {
      const msg = createErr?.message ?? "Could not create account";
      const lower = msg.toLowerCase();
      if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
        return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = created.user.id;

    const { error: pmErr } = await admin.from("portal_members").insert({
      user_id: userId,
      role: "client",
      tier: "basic",
      features: ["visitor_management"],
    });

    if (pmErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      if (/duplicate|unique/i.test(pmErr.message)) {
        return NextResponse.json({ error: "This account is already registered." }, { status: 400 });
      }
      return NextResponse.json({ error: pmErr.message ?? "Could not complete account setup" }, { status: 500 });
    }

    await ensureVisitorTrialSubscription(admin, userId).catch(() => {});

    const emailResult = await sendVisitorLoginCodeEmail(admin, userId, email, {
      subject: "Verify your Fusion Xpress Visitor Management email",
      headline: "Verify your email address",
      intro:
        "Thank you for signing up. Enter this code on the verification page to activate your organization account:",
    });

    if ("error" in emailResult && emailResult.error) {
      return NextResponse.json(
        {
          ok: true,
          emailWarning: "Account created but we could not send the login code email. Use Sign in and request a new code.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Account created. Check your email for a verification code.",
        verifyUrl: `/fusion-xpress/smart-visitor-management/verify-email?email=${encodeURIComponent(email)}`,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
