import { NextRequest, NextResponse } from "next/server";
import { endOfDay, parseISO, startOfDay } from "date-fns";

import {
  CRM_SITE_SETUP_MESSAGE,
  isMissingCrmSiteTables,
  mapCrmSiteVisitRow,
  type CrmSiteVisitRow,
} from "@/lib/employees/crm-site-db";
import { getCrmSiteVisitRankings } from "@/lib/employees/process-crm-site-visit";
import { assertRealEstateOrganization } from "@/lib/employees/require-real-estate-org";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const industryCheck = await assertRealEstateOrganization(admin, userId);
    if (!industryCheck.ok) {
      return NextResponse.json({ error: industryCheck.error }, { status: 403 });
    }

    const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
    const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";
    const rankingsOnly = req.nextUrl.searchParams.get("rankings") === "1";

    const fromDate = from ? startOfDay(parseISO(from)) : startOfDay(new Date());
    const toDate = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

    const rankingsResult = await getCrmSiteVisitRankings(
      admin,
      userId,
      fromDate.toISOString(),
      toDate.toISOString()
    );

    if (!rankingsResult.ok) {
      if (rankingsResult.error.includes("patch_07")) {
        return NextResponse.json({
          visits: [],
          rankings: [],
          setupRequired: true,
          message: CRM_SITE_SETUP_MESSAGE,
        });
      }
      return NextResponse.json({ error: rankingsResult.error }, { status: 500 });
    }

    if (rankingsOnly) {
      return NextResponse.json({ rankings: rankingsResult.rankings });
    }

    let q = admin
      .from("visitor_crm_site_visits")
      .select("*")
      .gte("sign_in_at", fromDate.toISOString())
      .lte("sign_in_at", toDate.toISOString())
      .order("sign_in_at", { ascending: false })
      .limit(500);

    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q;
    if (error) {
      if (isMissingCrmSiteTables(error)) {
        return NextResponse.json({
          visits: [],
          rankings: rankingsResult.rankings,
          setupRequired: true,
          message: CRM_SITE_SETUP_MESSAGE,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employeeIds = [
      ...new Set((data ?? []).map((r: CrmSiteVisitRow) => String(r.employee_id))),
    ];
    const nameById = new Map<string, string>();
    if (employeeIds.length > 0) {
      const { data: emps } = await admin
        .from("visitor_employees")
        .select("id,full_name")
        .in("id", employeeIds);
      for (const e of emps ?? []) {
        nameById.set(String(e.id), String(e.full_name));
      }
    }

    const visits = ((data ?? []) as CrmSiteVisitRow[]).map((row) =>
      mapCrmSiteVisitRow(row, nameById.get(row.employee_id) ?? "Unknown")
    );

    return NextResponse.json({
      visits,
      rankings: rankingsResult.rankings,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
