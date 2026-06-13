import type { AttendanceDailyLogRow } from "@/lib/employees/attendance-daily-log";
import type {
  EmployeeAttendanceRecord,
  EmployeeLeaveRecord,
  EmployeeRecord,
} from "@/lib/employees/types";

/** Stable JSON shape for HR / payroll systems. */
export type IntegrationEmployee = {
  id: string;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  department: string;
  jobTitle: string;
  memberType: string;
  status: string;
  payType: "hourly" | "monthly";
  payRate: number;
  payCurrency: string;
  lastSignInAt: string | null;
  lastSignOutAt: string | null;
  updatedAt: string;
};

export type IntegrationAttendanceEvent = {
  id: string;
  employeeId: string;
  eventType: "sign_in" | "sign_out";
  occurredAt: string;
  deviceLabel: string | null;
};

export type IntegrationLeaveRecord = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
  notes: string;
  approvedAt: string | null;
};

export type IntegrationDailyRegisterRow = {
  employeeId: string;
  date: string;
  employeeCode: string | null;
  fullName: string;
  department: string;
  status: "present" | "on_leave";
  leaveType: string | null;
  signInTime: string | null;
  signOutTime: string | null;
  hoursWorked: string | null;
};

export function mapIntegrationEmployee(
  emp: EmployeeRecord,
  pay?: { payType?: string | null; payRate?: number | string | null; payCurrency?: string | null }
): IntegrationEmployee {
  const payType = String(pay?.payType ?? "hourly").toLowerCase() === "monthly" ? "monthly" : "hourly";
  const payRate = Number(pay?.payRate ?? 0);
  return {
    id: emp.id,
    employeeCode: emp.employeeCode,
    fullName: emp.fullName,
    email: emp.email,
    department: emp.department,
    jobTitle: emp.jobTitle,
    memberType: emp.memberType ?? "staff",
    status: emp.status,
    payType,
    payRate: Number.isFinite(payRate) ? payRate : 0,
    payCurrency: String(pay?.payCurrency ?? "KES").trim() || "KES",
    lastSignInAt: emp.lastSignedInAt,
    lastSignOutAt: emp.lastSignedOutAt,
    updatedAt: emp.updatedAt,
  };
}

export function mapIntegrationAttendanceEvent(
  row: EmployeeAttendanceRecord
): IntegrationAttendanceEvent {
  return {
    id: row.id,
    employeeId: row.employeeId,
    eventType: row.eventType,
    occurredAt: row.createdAt,
    deviceLabel: row.deviceLabel,
  };
}

export function mapIntegrationLeave(row: EmployeeLeaveRecord): IntegrationLeaveRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    startDate: row.startDate,
    endDate: row.endDate,
    leaveType: row.leaveType,
    status: row.status,
    notes: row.notes,
    approvedAt: row.approvedAt,
  };
}

export function mapIntegrationDailyRegisterRow(
  row: AttendanceDailyLogRow,
  employeeById: Map<string, EmployeeRecord>
): IntegrationDailyRegisterRow {
  const emp = employeeById.get(row.employeeId);

  return {
    employeeId: row.employeeId,
    date: row.dayKey,
    employeeCode: emp?.employeeCode ?? (row.memberId !== "—" ? row.memberId : null),
    fullName: row.fullName,
    department: row.department !== "—" ? row.department : "",
    status: row.status,
    leaveType: row.leaveType !== "—" ? row.leaveType : null,
    signInTime: row.status === "present" && row.signInTime !== "—" ? row.signInTime : null,
    signOutTime: row.status === "present" && row.signOutTime !== "—" ? row.signOutTime : null,
    hoursWorked: row.hoursWorked !== "—" ? row.hoursWorked : null,
  };
}
