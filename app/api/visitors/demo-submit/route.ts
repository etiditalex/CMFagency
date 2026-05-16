import { NextRequest, NextResponse } from "next/server";

import { getIndustryDemo } from "@/lib/visitors/industry-demos";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return s.slice(0, max);
}

/** Public industry demo forms — stored in visitor_demo_submissions (service role). */
export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const industrySlug = safeText(body.industrySlug ?? body.industry_slug, 80);
    if (!industrySlug || !getIndustryDemo(industrySlug)) {
      return NextResponse.json({ error: "Invalid industry" }, { status: 400 });
    }

    const values =
      body.values && typeof body.values === "object" && !Array.isArray(body.values)
        ? (body.values as Record<string, unknown>)
        : body;

    const full_name = safeText(values.fullName ?? values.full_name, 200);
    const phone_number = safeText(values.phone ?? values.phoneNumber ?? values.phone_number, 40);
    const email = safeText(values.email, 200);

    const { error } = await admin.from("visitor_demo_submissions").insert({
      industry_slug: industrySlug,
      full_name,
      phone_number,
      email,
      form_payload: values,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Demo submissions table not set up. Run database/visitor_management_patch_01.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, demo: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
