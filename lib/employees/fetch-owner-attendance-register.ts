import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAttendanceSummary } from "@/lib/employees/attendance-summary";
import { buildAttendanceRegisterExcelBuffer } from "@/lib/employees/build-attendance-register-buffer";
import { buildAttendanceRegisterPdfBuffer } from "@/lib/employees/build-attendance-register-pdf";
import {
  EMPLOYEE_ATTENDANCE_SELECT,
  isMissingLeaveTable,
  mapAttendanceRow,
  mapEmployeeRow,
  mapLeaveRow,
  type EmployeeAttendanceRow,
  type EmployeeLeaveRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { fetchOwnerReportingSettings } from "@/lib/employees/fetch-reporting-settings";
import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import { formatEmployeeReportDate, formatEmployeeReportTime } from "@/lib/employees/utils";
import { eatDayBoundsUtc, eatNextDayKey } from "@/lib/time/eat";

export type OwnerAttendanceRegisterRangeResult = {
  businessName: string;
  from: string;
  to: string;
  rowCount: number;
  pdf: { buffer: Buffer; filename: string };
  excel: { buffer: Buffer; filename: string };
};

/** Builds attendance register PDF (+ Excel) for an organisation date range (EAT). */
export async function fetchOwnerAttendanceRegisterRange(
  admin: SupabaseClient,
  ownerId: string,
  from: string,
  to: string,
  periodLabel?: string
): Promise<OwnerAttendanceRegisterRangeResult | null> {
  const fromBounds = eatDayBoundsUtc(from);
  const toBounds = eatDayBoundsUtc(to);
  if (!fromBounds || !toBounds) return null;
  const lookAheadEnd =
    eatDayBoundsUtc(eatNextDayKey(to))?.endIso ?? toBounds.endIso;

  const { data: empData, error: empErr } = await admin
    .from("visitor_employees")
    .select(
      "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
    )
    .eq("owner_id", ownerId)
    .order("full_name", { ascending: true });

  if (empErr || !empData?.length) return null;

  const employees = ((empData ?? []) as EmployeeRow[]).map(mapEmployeeRow);

  const { data: attData, error: attErr } = await admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("owner_id", ownerId)
    .gte("created_at", fromBounds.startIso)
    .lte("created_at", lookAheadEnd)
    .order("created_at", { ascending: true })
    .limit(15000);

  if (attErr) return null;

  const attendance = ((attData ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);
  const reportingSettings = await fetchOwnerReportingSettings(admin, ownerId);
  const businessName = await resolveOwnerBusinessName(admin, ownerId);

  let leaveRecords: ReturnType<typeof mapLeaveRow>[] = [];
  const { data: leaveData, error: leaveErr } = await admin
    .from("visitor_employee_leave")
    .select(
      "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
    )
    .eq("owner_id", ownerId)
    .eq("status", "approved")
    .lte("start_date", to)
    .gte("end_date", from);

  if (!leaveErr && leaveData) {
    leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);
  } else if (leaveErr && !isMissingLeaveTable(leaveErr)) {
    return null;
  }

  const summary = buildAttendanceSummary({
    from,
    to,
    fromDate: new Date(fromBounds.startIso),
    toDate: new Date(toBounds.endIso),
    attendance,
    employees,
    formatDisplayTime: formatEmployeeReportTime,
    formatDisplayDate: formatEmployeeReportDate,
    reportingSettings,
    leaveRecords,
  });

  const [pdf, excel] = await Promise.all([
    buildAttendanceRegisterPdfBuffer(
      summary.events,
      employees,
      { organizationName: businessName, from, to, periodLabel },
      reportingSettings,
      leaveRecords
    ),
    buildAttendanceRegisterExcelBuffer(
      summary.events,
      employees,
      { organizationName: businessName, from, to },
      reportingSettings,
      leaveRecords
    ),
  ]);

  return {
    businessName,
    from,
    to,
    rowCount: pdf.rowCount,
    pdf: { buffer: pdf.buffer, filename: pdf.filename },
    excel: { buffer: excel.buffer, filename: excel.filename },
  };
}

/** Builds today's attendance register Excel for one organisation (EAT calendar day). */
export async function fetchOwnerAttendanceRegister(
  admin: SupabaseClient,
  ownerId: string,
  dayKey: string
): Promise<{
  buffer: Buffer;
  filename: string;
  businessName: string;
  dayKey: string;
  rowCount: number;
} | null> {
  const range = await fetchOwnerAttendanceRegisterRange(admin, ownerId, dayKey, dayKey);
  if (!range) return null;
  return {
    buffer: range.excel.buffer,
    filename: range.excel.filename,
    businessName: range.businessName,
    dayKey,
    rowCount: range.rowCount,
  };
}
