import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { LEAVE_ADVANCE_NOTICE_DAYS } from "@/lib/employees/leave-application";
import { lookupEmployeeByToken } from "@/lib/employees/process-employee-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function GET(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
    const result = await lookupEmployeeByToken(admin, token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const employee = result.employee;
    if (employee.status !== "active") {
      return NextResponse.json({ error: "This employee profile is inactive." }, { status: 403 });
    }

    const { data: rowData } = await admin
      .from("visitor_employees")
      .select("owner_id")
      .eq("id", employee.id)
      .maybeSingle();

    const ownerId = String(rowData?.owner_id ?? "");
    let organizationName = "Your organisation";
    if (ownerId) {
      const { data: ownerRes } = await admin.auth.admin.getUserById(ownerId);
      const meta = ownerRes?.user?.user_metadata as Record<string, unknown> | undefined;
      organizationName =
        String(meta?.business_name ?? meta?.businessName ?? meta?.organization_name ?? "").trim() ||
        organizationName;
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        designation: employee.jobTitle || "—",
        jobLocation: employee.department || "—",
        email: employee.email,
        employeeCode: employee.employeeCode,
      },
      organization: {
        name: organizationName,
      },
      policy: {
        advanceNoticeDays: LEAVE_ADVANCE_NOTICE_DAYS,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e)) {
      return NextResponse.json({ error: "Employee module not set up." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
