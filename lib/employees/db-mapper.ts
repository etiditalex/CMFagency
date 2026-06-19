import type {
  EmployeeAttendanceRecord,
  EmployeeAttendanceStatus,
  EmployeeLeaveAllocation,
  EmployeeLeaveRecord,
  EmployeeLeaveType,
  EmployeeMemberType,
  EmployeeRecord,
  EmployeeReportingSettings,
  EmployeeStatus,
} from "@/lib/employees/types";
import { defaultAllocationForEmployee } from "@/lib/employees/leave-balance";
import { parseLeaveType, parseLeaveStatus } from "@/lib/employees/leave-rules";

export type EmployeeRow = {
  id: string;
  owner_id: string;
  full_name: string;
  email: string | null;
  department: string | null;
  job_title: string | null;
  employee_code: string | null;
  qr_code_token: string | null;
  status: EmployeeStatus;
  attendance_status: EmployeeAttendanceStatus;
  registered_device_id: string | null;
  last_signed_in_at: string | null;
  last_signed_out_at: string | null;
  member_type?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportingSettingsRow = {
  owner_id: string;
  staff_reporting_sign_in_start?: string | null;
  staff_reporting_sign_in: string;
  staff_reporting_sign_out: string;
  crm_reporting_sign_in_start?: string | null;
  crm_reporting_sign_in: string;
  crm_reporting_sign_out: string;
  shift_enabled?: boolean | null;
  shift_1_start_time?: string | null;
  shift_1_end_time?: string | null;
  shift_2_start_time?: string | null;
  shift_2_end_time?: string | null;
  shift_1_sign_in_start_time?: string | null;
  shift_1_sign_in_time?: string | null;
  shift_1_sign_out_time?: string | null;
  shift_2_sign_in_start_time?: string | null;
  shift_2_sign_in_time?: string | null;
  shift_2_sign_out_time?: string | null;
  updated_at: string;
};

function normalizeTime(t: string | null | undefined): string {
  const s = String(t ?? "").trim();
  const m = s.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "09:00";
}

function parseMemberType(raw: string | null | undefined): EmployeeMemberType {
  return String(raw ?? "").toLowerCase() === "crm" ? "crm" : "staff";
}

export function mapReportingSettingsRow(
  row: ReportingSettingsRow | null
): EmployeeReportingSettings {
  return {
    staffReportingSignInStart: normalizeTime(row?.staff_reporting_sign_in_start ?? "07:00"),
    staffReportingSignIn: normalizeTime(row?.staff_reporting_sign_in ?? "08:00"),
    staffReportingSignOut: normalizeTime(row?.staff_reporting_sign_out ?? "17:00"),
    crmReportingSignInStart: normalizeTime(row?.crm_reporting_sign_in_start ?? "07:00"),
    crmReportingSignIn: normalizeTime(row?.crm_reporting_sign_in ?? "08:00"),
    crmReportingSignOut: normalizeTime(row?.crm_reporting_sign_out ?? "17:00"),
    updatedAt: row?.updated_at ?? null,
    shiftEnabled: row?.shift_enabled === true,
    shift1StartTime: normalizeTime(row?.shift_1_start_time ?? "06:00"),
    shift1EndTime: normalizeTime(row?.shift_1_end_time ?? "15:00"),
    shift2StartTime: normalizeTime(row?.shift_2_start_time ?? "15:00"),
    shift2EndTime: normalizeTime(row?.shift_2_end_time ?? "23:00"),
    shift1SignInStartTime: normalizeTime(row?.shift_1_sign_in_start_time ?? "06:00"),
    shift1SignInTime: normalizeTime(row?.shift_1_sign_in_time ?? "08:00"),
    shift1SignOutTime: normalizeTime(row?.shift_1_sign_out_time ?? "15:00"),
    shift2SignInStartTime: normalizeTime(row?.shift_2_sign_in_start_time ?? "15:00"),
    shift2SignInTime: normalizeTime(row?.shift_2_sign_in_time ?? "16:00"),
    shift2SignOutTime: normalizeTime(row?.shift_2_sign_out_time ?? "23:00"),
  };
}

export const DEFAULT_REPORTING_SETTINGS: EmployeeReportingSettings = {
  staffReportingSignInStart: "07:00",
  staffReportingSignIn: "08:00",
  staffReportingSignOut: "17:00",
  crmReportingSignInStart: "07:00",
  crmReportingSignIn: "08:00",
  crmReportingSignOut: "17:00",
  updatedAt: null,
};

export type EmployeeAttendanceRow = {
  id: string;
  employee_id: string;
  owner_id: string;
  event_type: "sign_in" | "sign_out";
  device_id: string | null;
  device_label: string | null;
  device_info: Record<string, unknown> | null;
  shift_number?: number | null;
  created_at: string;
};

export const EMPLOYEE_ATTENDANCE_SELECT =
  "id,employee_id,owner_id,event_type,device_id,device_label,device_info,shift_number,created_at";

export function mapEmployeeRow(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    memberType: parseMemberType(row.member_type),
    fullName: row.full_name,
    email: row.email,
    department: row.department ?? "",
    jobTitle: row.job_title ?? "",
    employeeCode: row.employee_code,
    qrCodeToken: row.qr_code_token,
    status: row.status,
    attendanceStatus: row.attendance_status,
    registeredDeviceId: row.registered_device_id,
    lastSignedInAt: row.last_signed_in_at,
    lastSignedOutAt: row.last_signed_out_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttendanceRow(row: EmployeeAttendanceRow): EmployeeAttendanceRecord {
  const shiftRaw = row.shift_number;
  const shiftNumber =
    shiftRaw === 1 || shiftRaw === 2 ? shiftRaw : shiftRaw != null ? Number(shiftRaw) : null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    eventType: row.event_type,
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    deviceInfo:
      row.device_info && typeof row.device_info === "object" && !Array.isArray(row.device_info)
        ? (row.device_info as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
    shiftNumber: shiftNumber === 1 || shiftNumber === 2 ? shiftNumber : null,
  };
}

export type EmployeeLeaveRow = {
  id: string;
  owner_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status?: string | null;
  notes: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  notification_sent_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function mapLeaveRow(row: EmployeeLeaveRow): EmployeeLeaveRecord {
  const status = parseLeaveStatus(row.status) ?? "pending";
  return {
    id: row.id,
    employeeId: row.employee_id,
    startDate: row.start_date,
    endDate: row.end_date,
    leaveType: parseLeaveType(row.leave_type) as EmployeeLeaveType,
    status,
    notes: row.notes ?? "",
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    notificationSentAt: row.notification_sent_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMPLOYEES_TABLE = "visitor_employees";
const LEAVE_TABLE = "visitor_employee_leave";
const LEAVE_ALLOCATIONS_TABLE = "visitor_employee_leave_allocations";

export function isMissingEmployeesTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  const code = String((err as { code?: string })?.code ?? "").toUpperCase();
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204") return true;
  if (!msg.includes(EMPLOYEES_TABLE)) return false;
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("relation") ||
    msg.includes("visitor_employees_patch")
  );
}

export function isMissingEmployeesTableMessage(message: string): boolean {
  return isMissingEmployeesTable({ message });
}

export function isMissingLeaveTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  const code = String((err as { code?: string })?.code ?? "").toUpperCase();
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204") {
    return msg.includes(LEAVE_TABLE) || msg.includes("leave");
  }
  if (!msg.includes(LEAVE_TABLE) && !msg.includes("employee_leave")) return false;
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("relation") ||
    msg.includes("patch_11")
  );
}

export const LEAVE_SETUP_MESSAGE =
  "Run database/visitor_employees_patch_11_leave.sql in the Supabase SQL Editor, then reload the API schema if needed.";

export const LEAVE_ALLOCATIONS_SETUP_MESSAGE =
  "Run database/visitor_employees_patch_16_leave_allocations.sql in the Supabase SQL Editor, then reload the API schema if needed.";

export type EmployeeLeaveAllocationRow = {
  id: string;
  owner_id: string;
  employee_id: string;
  leave_year: number;
  annual_days: number | string;
  sick_days: number | string;
  compassionate_days: number | string;
  unpaid_days: number | string | null;
  other_days: number | string;
  created_at: string;
  updated_at: string;
};

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : fallback;
}

export function mapLeaveAllocationRow(
  row: EmployeeLeaveAllocationRow | null,
  employeeId: string,
  leaveYear: number
): EmployeeLeaveAllocation {
  if (!row) {
    return defaultAllocationForEmployee(employeeId, leaveYear);
  }
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveYear: row.leave_year,
    annualDays: toNumber(row.annual_days, 21),
    sickDays: toNumber(row.sick_days, 14),
    compassionateDays: toNumber(row.compassionate_days, 5),
    unpaidDays: row.unpaid_days == null ? null : toNumber(row.unpaid_days, 0),
    otherDays: toNumber(row.other_days, 0),
    updatedAt: row.updated_at ?? null,
  };
}

export function isMissingLeaveAllocationsTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  const code = String((err as { code?: string })?.code ?? "").toUpperCase();
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204") {
    return msg.includes(LEAVE_ALLOCATIONS_TABLE) || msg.includes("leave_allocations");
  }
  if (!msg.includes(LEAVE_ALLOCATIONS_TABLE) && !msg.includes("leave_allocations")) return false;
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("relation") ||
    msg.includes("patch_16")
  );
}

export const EMPLOYEES_SETUP_MESSAGE =
  "Run database/visitor_employees_patch_01.sql in the Supabase SQL Editor (after visitor_management_patch_01.sql). Then open Project Settings → API and click “Reload schema” if the error persists.";
