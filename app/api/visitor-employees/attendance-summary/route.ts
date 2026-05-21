import { NextRequest, NextResponse } from "next/server";

import {
  buildAttendanceSummary,
  parseAttendanceSummaryDateRange,
} from "@/lib/employees/attendance-summary";
import {
  isMissingEmployeesTable,
  mapAttendanceRow,
  mapEmployeeRow,
  type EmployeeAttendanceRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import {
  formatEmployeeReportDate,
  formatEmployeeReportTime,
} from "@/lib/employees/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const parsed = parseAttendanceSummaryDateRange(
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to")
    );
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";

    let empQuery = admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
      )
      .order("full_name", { ascending: true });

    if (!isAdmin) empQuery = empQuery.eq("owner_id", userId);
    if (employeeId) empQuery = empQuery.eq("id", employeeId);

    const { data: empData, error: empErr } = await empQuery;
    if (empErr) {
      if (isMissingEmployeesTable(empErr)) {
        return NextResponse.json({ setupRequired: true, employees: [] });
      }
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }

    const employees = ((empData ?? []) as EmployeeRow[]).map(mapEmployeeRow);
    const employeeIds = employees.map((e) => e.id);

    if (employeeId && employeeIds.length === 0) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    let attQuery = admin
      .from("visitor_employee_attendance")
      .select("id,employee_id,owner_id,event_type,device_id,device_label,device_info,created_at")
      .gte("created_at", parsed.fromDate.toISOString())
      .lte("created_at", parsed.toDate.toISOString())
      .order("created_at", { ascending: true })
      .limit(15000);

    if (!isAdmin) attQuery = attQuery.eq("owner_id", userId);
    if (employeeIds.length > 0) attQuery = attQuery.in("employee_id", employeeIds);
    else if (employeeId) {
      return NextResponse.json(
        buildAttendanceSummary({
          from: parsed.from,
          to: parsed.to,
          fromDate: parsed.fromDate,
          toDate: parsed.toDate,
          attendance: [],
          employees: [],
          formatDisplayTime: formatEmployeeReportTime,
          formatDisplayDate: formatEmployeeReportDate,
        })
      );
    }

    const { data: attData, error: attErr } = await attQuery;
    if (attErr) {
      if (isMissingEmployeesTable(attErr)) {
        return NextResponse.json({ setupRequired: true });
      }
      return NextResponse.json({ error: attErr.message }, { status: 500 });
    }

    const attendance = ((attData ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);

    const summary = buildAttendanceSummary({
      from: parsed.from,
      to: parsed.to,
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      attendance,
      employees,
      formatDisplayTime: formatEmployeeReportTime,
      formatDisplayDate: formatEmployeeReportDate,
    });

    return NextResponse.json({
      summary,
      organizationEventCount: summary.totals.events,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
