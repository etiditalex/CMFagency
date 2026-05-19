import type { EmployeeAttendanceStatus, EmployeeRecord } from "@/lib/employees/types";
import { formatCheckInClock, formatCheckInEmailDateTime } from "@/lib/visitors/format-check-in-display";

export function employeeAttendanceLabel(status: EmployeeAttendanceStatus): string {
  return status === "in" ? "Signed in" : "Signed out";
}

export function employeeAttendanceBadgeClass(status: EmployeeAttendanceStatus): string {
  return status === "in"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}

export function employeeStatusBadgeClass(status: EmployeeRecord["status"]): string {
  return status === "active"
    ? "bg-primary-50 text-primary-800 border-primary-100"
    : "bg-gray-100 text-gray-600 border-gray-200";
}

export function formatEmployeeTimestamp(iso: string | null | undefined): string {
  return formatCheckInClock(iso);
}

export function formatEmployeeEmailDateTime(iso: string | null | undefined): string {
  return formatCheckInEmailDateTime(iso);
}

export function employeeStats(employees: EmployeeRecord[]) {
  const active = employees.filter((e) => e.status === "active");
  return {
    total: employees.length,
    active: active.length,
    signedIn: active.filter((e) => e.attendanceStatus === "in").length,
    signedOut: active.filter((e) => e.attendanceStatus === "out").length,
  };
}

export function employeeQrPayload(token: string, siteOrigin?: string): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = `/fusion-xpress/smart-visitor-management/employee-check?token=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

/** CRM field visit sign-in/out at project sites (real estate). */
export function crmSiteQrPayload(token: string, siteOrigin?: string): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = `/fusion-xpress/smart-visitor-management/crm-site-check?token=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}
