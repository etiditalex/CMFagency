import { NextRequest, NextResponse } from "next/server";

import {
  isMissingCrmSiteTables,
  mapCrmSiteVisitRow,
  type CrmSiteVisitRow,
} from "@/lib/employees/crm-site-db";
import { lookupEmployeeByToken } from "@/lib/employees/process-employee-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export const dynamic = "force-dynamic";

/** Public: current open site visit + active projects for CRM token. */
export async function GET(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
    const lookup = await lookupEmployeeByToken(admin, token);
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status });
    }

    const employee = lookup.employee;
    if (employee.memberType !== "crm") {
      return NextResponse.json(
        { error: "Site GPS is for CRM team members only." },
        { status: 403 }
      );
    }

    const { data: ownerRow } = await admin
      .from("visitor_employees")
      .select("owner_id")
      .eq("id", employee.id)
      .maybeSingle();

    const ownerId = String(ownerRow?.owner_id ?? "");

    const { data: openRow, error: openErr } = await admin
      .from("visitor_crm_site_visits")
      .select("*")
      .eq("employee_id", employee.id)
      .is("sign_out_at", null)
      .maybeSingle();

    if (openErr && !isMissingCrmSiteTables(openErr)) {
      return NextResponse.json({ error: openErr.message }, { status: 500 });
    }

    const { data: projects, error: projErr } = await admin
      .from("visitor_crm_projects")
      .select("id,name,suburb,state,latitude,longitude")
      .eq("owner_id", ownerId)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (projErr && !isMissingCrmSiteTables(projErr)) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        memberType: employee.memberType,
      },
      openVisit: openRow
        ? mapCrmSiteVisitRow(openRow as CrmSiteVisitRow, employee.fullName)
        : null,
      projects: (projects ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        suburb: p.suburb ?? "",
        state: p.state ?? "",
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      setupRequired: isMissingCrmSiteTables(openErr),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
