import { NextRequest } from "next/server";

import { buildAttendanceDailyLogRows } from "@/lib/employees/attendance-daily-log";
import {
  buildAttendanceSummary,
  parseAttendanceSummaryDateRange,
} from "@/lib/employees/attendance-summary";
import {
  isMissingEmployeesTable,
  isMissingLeaveTable,
  mapAttendanceRow,
  mapEmployeeRow,
  mapLeaveRow,
  type EmployeeAttendanceRow,
  type EmployeeLeaveRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { fetchOwnerReportingSettings } from "@/lib/employees/fetch-reporting-settings";
import { formatEmployeeReportDate, formatEmployeeReportTime } from "@/lib/employees/utils";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationDailyRegisterRow } from "@/lib/integrations/integration-mapper";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

/** Payroll-friendly daily register: present days + approved leave days per employee. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "register:read");
    if ("error" in auth) return auth.error;

    const parsed = parseAttendanceSummaryDateRange(
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to")
    );
    if ("error" in parsed) {
      return integrationJson({ error: parsed.error }, 400);
    }

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";

    let empQuery = auth.admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
      )
      .eq("owner_id", auth.ownerId)
      .order("full_name", { ascending: true });

    if (employeeId) empQuery = empQuery.eq("id", employeeId);

    const { data: empData, error: empErr } = await empQuery;
    if (empErr) {
      if (isMissingEmployeesTable(empErr)) {
        return integrationJson({ rows: [], setupRequired: true }, 503);
      }
      return integrationJson({ error: empErr.message }, 500);
    }

    const employees = ((empData ?? []) as EmployeeRow[]).map(mapEmployeeRow);
    const employeeById = new Map(employees.map((e) => [e.id, e]));
    const employeeIds = employees.map((e) => e.id);

    let attQuery = auth.admin
      .from("visitor_employee_attendance")
      .select("id,employee_id,owner_id,event_type,device_id,device_label,device_info,created_at")
      .eq("owner_id", auth.ownerId)
      .gte("created_at", parsed.fromDate.toISOString())
      .lte("created_at", parsed.toDate.toISOString())
      .order("created_at", { ascending: true })
      .limit(15000);

    if (employeeIds.length > 0) attQuery = attQuery.in("employee_id", employeeIds);

    const { data: attData, error: attErr } = await attQuery;
    if (attErr) {
      return integrationJson({ error: attErr.message }, 500);
    }

    const attendance = ((attData ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);
    const reportingSettings = await fetchOwnerReportingSettings(auth.admin, auth.ownerId);

    let leaveRecords: ReturnType<typeof mapLeaveRow>[] = [];
    let leaveQuery = auth.admin
      .from("visitor_employee_leave")
      .select(
        "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
      )
      .eq("owner_id", auth.ownerId)
      .eq("status", "approved")
      .lte("start_date", parsed.to)
      .gte("end_date", parsed.from);

    if (employeeIds.length > 0) leaveQuery = leaveQuery.in("employee_id", employeeIds);

    const { data: leaveData, error: leaveErr } = await leaveQuery;
    if (!leaveErr && leaveData) {
      leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);
    } else if (leaveErr && !isMissingLeaveTable(leaveErr)) {
      return integrationJson({ error: leaveErr.message }, 500);
    }

    const summary = buildAttendanceSummary({
      from: parsed.from,
      to: parsed.to,
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      attendance,
      employees,
      formatDisplayTime: formatEmployeeReportTime,
      formatDisplayDate: formatEmployeeReportDate,
      reportingSettings,
      leaveRecords,
    });

    const logRows = buildAttendanceDailyLogRows(summary.events, employees, reportingSettings, {
      leaveRecords,
      from: parsed.from,
      to: parsed.to,
    });

    const rows = logRows.map((row) => mapIntegrationDailyRegisterRow(row, employeeById));

    return integrationJson({
      from: parsed.from,
      to: parsed.to,
      rows,
      count: rows.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
