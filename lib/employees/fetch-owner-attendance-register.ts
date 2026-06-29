import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAttendanceSummary } from "@/lib/employees/attendance-summary";
import { buildAttendanceRegisterExcelBuffer } from "@/lib/employees/build-attendance-register-buffer";
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
import { eatDayBoundsUtc } from "@/lib/time/eat";

export type OwnerAttendanceRegisterResult = {
  buffer: Buffer;
  filename: string;
  businessName: string;
  dayKey: string;
  rowCount: number;
};

/** Builds today's attendance register Excel for one organisation (EAT calendar day). */
export async function fetchOwnerAttendanceRegister(
  admin: SupabaseClient,
  ownerId: string,
  dayKey: string
): Promise<OwnerAttendanceRegisterResult | null> {
  const bounds = eatDayBoundsUtc(dayKey);
  if (!bounds) return null;

  const { data: empData, error: empErr } = await admin
    .from("visitor_employees")
    .select(
      "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
    )
    .eq("owner_id", ownerId)
    .order("full_name", { ascending: true });

  if (empErr || !empData?.length) return null;

  const employees = ((empData ?? []) as EmployeeRow[]).map(mapEmployeeRow);
  const employeeIds = employees.map((e) => e.id);

  const { data: attData, error: attErr } = await admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("owner_id", ownerId)
    .gte("created_at", bounds.startIso)
    .lte("created_at", bounds.endIso)
    .order("created_at", { ascending: true })
    .limit(5000);

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
    .lte("start_date", dayKey)
    .gte("end_date", dayKey);

  if (!leaveErr && leaveData) {
    leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);
  } else if (leaveErr && !isMissingLeaveTable(leaveErr)) {
    return null;
  }

  const summary = buildAttendanceSummary({
    from: dayKey,
    to: dayKey,
    fromDate: new Date(bounds.startIso),
    toDate: new Date(bounds.endIso),
    attendance,
    employees,
    formatDisplayTime: formatEmployeeReportTime,
    formatDisplayDate: formatEmployeeReportDate,
    reportingSettings,
    leaveRecords,
  });

  const { buffer, filename } = await buildAttendanceRegisterExcelBuffer(
    summary.events,
    employees,
    { organizationName: businessName, from: dayKey, to: dayKey },
    reportingSettings,
    leaveRecords
  );

  return {
    buffer,
    filename,
    businessName,
    dayKey,
    rowCount: summary.events.length,
  };
}
