import { buildAttendanceDailyLogRows } from "@/lib/employees/attendance-daily-log";
import type {
  AttendanceSummaryEmployeeRow,
  AttendanceSummaryEventRow,
  AttendanceSummaryRankEntry,
  AttendanceSummaryRankings,
} from "@/lib/employees/attendance-summary";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import type { EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";

async function loadXlsx() {
  return import("xlsx");
}

export type SummaryReportExportMeta = {
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

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rankEntryRows(rows: AttendanceSummaryRankEntry[]) {
  return rows.map((r) => ({
    Rank: r.rank,
    Name: r.fullName,
    Department: r.department || memberTypeLabel(r.memberType),
    Metric: r.metric,
    Detail: r.detail,
  }));
}

export async function downloadPerEmployeeSummaryExcel(
  rows: AttendanceSummaryEmployeeRow[],
  meta: SummaryReportExportMeta
): Promise<void> {
  const XLSX = await loadXlsx();
  const data = rows.map((row) => ({
    Name: row.fullName,
    Team: memberTypeLabel(row.memberType as "staff" | "crm"),
    Department: row.department || "",
    Days: row.daysAttended,
    "Approved leave days": row.leaveDays,
    "Sign ins": row.signInCount,
    "Sign outs": row.signOutCount,
    "First sign-in": row.firstSignIn ? formatEmployeeEmailDateTime(row.firstSignIn) : "",
    "Last sign-out": row.lastSignOut ? formatEmployeeEmailDateTime(row.lastSignOut) : "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(data.length ? data : [{ note: "No attendance recorded in this period" }]),
    "Per-employee summary"
  );

  const org = orgSlug(meta.organizationName);
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(buffer, `per-employee-summary-${org}-${meta.from}-to-${meta.to}.xlsx`);
}

export async function downloadStaffRankingsExcel(
  rankings: AttendanceSummaryRankings,
  meta: SummaryReportExportMeta
): Promise<void> {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  const sheets: { name: string; rows: AttendanceSummaryRankEntry[]; empty: string }[] = [
    {
      name: "Staff most days",
      rows: rankings.staff.mostAttendant,
      empty: "No staff attendance in this period",
    },
    {
      name: "Staff earliest",
      rows: rankings.staff.earliestArrival,
      empty: "No staff sign-ins in this period",
    },
    {
      name: "CRM most days",
      rows: rankings.crm.mostAttendant,
      empty: "No CRM attendance in this period",
    },
    {
      name: "CRM earliest",
      rows: rankings.crm.earliestArrival,
      empty: "No CRM sign-ins in this period",
    },
  ];

  for (const sheet of sheets) {
    const data = rankEntryRows(sheet.rows);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.length ? data : [{ note: sheet.empty }]),
      sheet.name
    );
  }

  const org = orgSlug(meta.organizationName);
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(buffer, `staff-rankings-${org}-${meta.from}-to-${meta.to}.xlsx`);
}

export async function downloadAttendanceRegisterExcel(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[],
  meta: SummaryReportExportMeta,
  reportingSettings?: EmployeeReportingSettings,
  leaveRecords?: EmployeeLeaveRecord[]
): Promise<void> {
  const XLSX = await loadXlsx();
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
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(buffer, `attendance-register-${org}-${meta.from}-to-${meta.to}.xlsx`);
}
