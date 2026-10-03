import { NextRequest, NextResponse } from "next/server";

import { isMissingBiometricTable, listEmployeeCredentials, resolveEmployeeForBiometric } from "@/lib/employees/biometric";
import { fetchTodayAttendanceStatus } from "@/lib/employees/process-employee-scan";
import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function GET(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
    const resolved = await resolveEmployeeForBiometric(admin, token);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    let credentials: Awaited<ReturnType<typeof listEmployeeCredentials>> = [];
    try {
      credentials = await listEmployeeCredentials(admin, resolved.employee.id);
    } catch (e: unknown) {
      if (isMissingBiometricTable(e)) {
        return NextResponse.json(
          { error: "Biometric recognition is not set up yet. Ask your manager to finish database setup." },
          { status: 503 }
        );
      }
      throw e;
    }

    const attendanceStatus = await fetchTodayAttendanceStatus(admin, resolved.employee.id);
    const businessName = await resolveOwnerBusinessName(admin, resolved.ownerId);
    const e = resolved.employee;

    return NextResponse.json({
      businessName,
      platformEnrolled: credentials.some((row) => row.attachment === "platform"),
      readerEnrolled: credentials.some((row) => row.attachment === "cross-platform"),
      employee: {
        id: e.id,
        fullName: e.fullName,
        department: e.department,
        employeeCode: e.employeeCode,
        attendanceStatus,
        lastSignedInAt: e.lastSignedInAt,
        lastSignedOutAt: e.lastSignedOutAt,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
