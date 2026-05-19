import type {
  EmployeeAttendanceRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { DEFAULT_REPORTING_SETTINGS } from "@/lib/employees/db-mapper";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import {
  reportingWindowForMember,
  signInReportingStatus,
  signInStatusLabel,
} from "@/lib/employees/reporting-time";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";

async function loadXlsx() {
  return import("xlsx");
}

function employeeSummaryRow(
  e: EmployeeRecord,
  reportingSettings: EmployeeReportingSettings,
  includeReporting: boolean
) {
  const window = reportingWindowForMember(reportingSettings, e.memberType);
  const reportingStatus = signInReportingStatus(e.lastSignedInAt, window);
  const base = {
    Name: e.fullName,
    Team: memberTypeLabel(e.memberType),
    Department: e.department || "",
    "Job title": e.jobTitle || "",
    "Employee code": e.employeeCode || "",
    Status: e.status,
    "Current attendance": e.attendanceStatus === "in" ? "Signed in" : "Signed out",
    "Last sign-in": e.lastSignedInAt ? formatEmployeeEmailDateTime(e.lastSignedInAt) : "",
    "Last sign-out": e.lastSignedOutAt ? formatEmployeeEmailDateTime(e.lastSignedOutAt) : "",
    "QR token": e.qrCodeToken || "",
  };
  if (!includeReporting) return base;
  return {
    ...base,
    "Sign-in window": `${window.signInStart} – ${window.signInLatest}`,
    "Sign-out from": window.signOut,
    "Sign-in vs reporting": signInStatusLabel(reportingStatus),
  };
}

export async function downloadEmployeeAttendanceExcel(params: {
  employees: EmployeeRecord[];
  attendance: EmployeeAttendanceRecord[];
  employeeNameById: Map<string, string>;
  organizationName?: string;
  isRealEstate?: boolean;
  reportingSettings?: EmployeeReportingSettings;
}): Promise<void> {
  const XLSX = await loadXlsx();
  const reporting = params.reportingSettings ?? DEFAULT_REPORTING_SETTINGS;
  const isRealEstate = params.isRealEstate === true;

  const employeeById = new Map(params.employees.map((e) => [e.id, e]));

  const buildSummaryRows = (list: EmployeeRecord[]) =>
    list.map((e) => employeeSummaryRow(e, reporting, true));

  const staffTeam = params.employees.filter((e) => e.memberType === "staff");
  const crmTeam = params.employees.filter((e) => e.memberType === "crm");

  const eventRows = params.attendance.map((a) => {
    const emp = employeeById.get(a.employeeId);
    const row: Record<string, string> = {
      "Staff name": params.employeeNameById.get(a.employeeId) ?? a.employeeId,
      Event: a.eventType === "sign_in" ? "Sign in" : "Sign out",
      "Date & time": formatEmployeeEmailDateTime(a.createdAt),
      Device: a.deviceLabel || a.deviceId || "",
    };
    if (isRealEstate && emp) {
      row.Team = memberTypeLabel(emp.memberType);
    }
    return row;
  });

  const wb = XLSX.utils.book_new();

  if (isRealEstate) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        buildSummaryRows(staffTeam).length ? buildSummaryRows(staffTeam) : [{ note: "No staff team members" }]
      ),
      "Staff team"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        buildSummaryRows(crmTeam).length ? buildSummaryRows(crmTeam) : [{ note: "No CRM team members" }]
      ),
      "CRM team"
    );
  } else {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        buildSummaryRows(params.employees).length
          ? buildSummaryRows(params.employees)
          : [{ note: "No staff" }]
      ),
      isRealEstate ? "Staff summary" : "Employees"
    );
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(eventRows.length ? eventRows : [{ note: "No attendance events" }]),
    "Attendance log"
  );

  const org =
    (params.organizationName ?? "organisation")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "attendance";
  const date = new Date().toISOString().slice(0, 10);

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employee-attendance-${org}-${date}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
