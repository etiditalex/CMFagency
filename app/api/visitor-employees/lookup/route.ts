import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
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

    const e = result.employee;
    return NextResponse.json({
      employee: {
        id: e.id,
        fullName: e.fullName,
        department: e.department,
        attendanceStatus: e.attendanceStatus,
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
