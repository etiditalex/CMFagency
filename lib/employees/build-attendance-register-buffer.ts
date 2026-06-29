import { buildAttendanceDailyLogRows } from "@/lib/employees/attendance-daily-log";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import type { EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";

export type AttendanceRegisterExportMeta = {
  organizationName?: string;
  from: string;
  to: string;
};

function orgSlug(organizationName?: string): string {
  return (
    (organizationName ?? "organisation")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "attendance"
  );
}

export async function buildAttendanceRegisterExcelBuffer(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[],
  meta: AttendanceRegisterExportMeta,
  reportingSettings?: EmployeeReportingSettings,
  leaveRecords?: EmployeeLeaveRecord[]
): Promise<{ buffer: Buffer; filename: string }> {
  const XLSX = await import("xlsx");
  const logRows = buildAttendanceDailyLogRows(events, employees, reportingSettings, {
    leaveRecords,
    from: meta.from,
    to: meta.to,
  });
  const shiftEnabled = reportingSettings?.shiftEnabled === true;
  const data = logRows.map((row) => {
    const base: Record<string, string> = {
      Name: row.fullName,
      "Member ID": row.memberId,
      Department: row.department,
      Status: row.status === "on_leave" ? "On leave" : "Present",
      "Leave type": row.leaveType,
      "Sign in": row.signInLabel,
      Date: row.signInDate,
      "Sign in time": row.signInTime,
      "Sign out": row.signOutLabel,
      "Sign out time": row.signOutTime,
    };
    if (shiftEnabled) {
      base.Shift = row.shiftLabel;
      base["Hours worked"] = row.hoursWorked;
    }
    return base;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(data.length ? data : [{ note: "No attendance recorded in this period" }]),
    "Attendance register"
  );

  const org = orgSlug(meta.organizationName);
  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const filename =
    meta.from === meta.to
      ? `attendance-register-${org}-${meta.from}.xlsx`
      : `attendance-register-${org}-${meta.from}-to-${meta.to}.xlsx`;

  return { buffer: Buffer.from(arrayBuffer), filename };
}
