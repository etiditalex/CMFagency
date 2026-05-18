import type { EmployeeAttendanceRecord, EmployeeRecord } from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";

async function loadXlsx() {
  return import("xlsx");
}

export async function downloadEmployeeAttendanceExcel(params: {
  employees: EmployeeRecord[];
  attendance: EmployeeAttendanceRecord[];
  employeeNameById: Map<string, string>;
  organizationName?: string;
}): Promise<void> {
  const XLSX = await loadXlsx();

  const staffRows = params.employees.map((e) => ({
    Name: e.fullName,
    Department: e.department || "",
    "Job title": e.jobTitle || "",
    "Employee code": e.employeeCode || "",
    Status: e.status,
    "Current attendance": e.attendanceStatus === "in" ? "Signed in" : "Signed out",
    "Last sign-in": e.lastSignedInAt ? formatEmployeeEmailDateTime(e.lastSignedInAt) : "",
    "Last sign-out": e.lastSignedOutAt ? formatEmployeeEmailDateTime(e.lastSignedOutAt) : "",
    "QR token": e.qrCodeToken || "",
  }));

  const eventRows = params.attendance.map((a) => ({
    "Staff name": params.employeeNameById.get(a.employeeId) ?? a.employeeId,
    Event: a.eventType === "sign_in" ? "Sign in" : "Sign out",
    "Date & time": formatEmployeeEmailDateTime(a.createdAt),
    Device: a.deviceLabel || a.deviceId || "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(staffRows.length ? staffRows : [{ note: "No staff" }]),
    "Staff summary"
  );
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
