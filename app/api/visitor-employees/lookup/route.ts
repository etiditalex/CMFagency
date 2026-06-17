import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import {
  fetchTodayAttendanceStatus,
  lookupEmployeeByToken,
} from "@/lib/employees/process-employee-scan";
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

    const e = result.employee;
    const attendanceStatusToday = await fetchTodayAttendanceStatus(admin, e.id);

    const { data: ownerRow } = await admin
      .from("visitor_employees")
      .select("owner_id")
      .eq("id", e.id)
      .maybeSingle();
    const businessName = ownerRow?.owner_id
      ? await resolveOwnerBusinessName(admin, String(ownerRow.owner_id))
      : "Your organisation";

    return NextResponse.json({
      businessName,
      employee: {
        id: e.id,
        fullName: e.fullName,
        department: e.department,
        employeeCode: e.employeeCode,
        attendanceStatus: attendanceStatusToday,
        lastSignedInAt: e.lastSignedInAt,
        lastSignedOutAt: e.lastSignedOutAt,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e)) {
      return NextResponse.json({ error: "Employee tables not set up." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
