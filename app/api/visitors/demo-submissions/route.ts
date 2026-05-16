import { NextRequest, NextResponse } from "next/server";

import {
  isMissingVisitorsTable,
  mapDemoSubmissionRow,
  type DemoSubmissionRow,
} from "@/lib/visitors/db-mapper";
import { isVisitorIndustrySlug } from "@/lib/visitors/industry-options";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    let q = admin
      .from("visitor_demo_submissions")
      .select("id,industry_slug,full_name,phone_number,email,form_payload,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const industrySlug = req.nextUrl.searchParams.get("industrySlug")?.trim() ?? "";
    if (industrySlug && isVisitorIndustrySlug(industrySlug)) {
      q = q.eq("industry_slug", industrySlug);
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingVisitorsTable(error)) {
        return NextResponse.json({
          submissions: [],
          setupRequired: true,
          message: "Run database/visitor_management_patch_01.sql in Supabase.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const submissions = ((data ?? []) as DemoSubmissionRow[]).map(mapDemoSubmissionRow);
    return NextResponse.json({ submissions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
