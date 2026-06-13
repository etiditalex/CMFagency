import type { EmployeeLeaveRecord, EmployeeLeaveStatus, EmployeeLeaveType } from "@/lib/employees/types";
import { eachEatDayKeys } from "@/lib/time/eat";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const EMPLOYEE_LEAVE_TYPES: EmployeeLeaveType[] = [
  "annual",
  "sick",
  "unpaid",
  "compassionate",
  "other",
];

export const EMPLOYEE_LEAVE_STATUSES: EmployeeLeaveStatus[] = ["pending", "approved", "rejected"];

export function leaveTypeLabel(type: EmployeeLeaveType | string): string {
  switch (String(type).toLowerCase()) {
    case "annual":
      return "Annual leave";
    case "sick":
      return "Sick leave";
    case "unpaid":
      return "Unpaid leave";
    case "compassionate":
      return "Compassionate leave";
    default:
      return "Other leave";
  }
}

export function leaveStatusLabel(status: EmployeeLeaveStatus | string): string {
  switch (String(status).toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending approval";
  }
}

export function parseLeaveType(raw: unknown): EmployeeLeaveType {
  const v = String(raw ?? "").toLowerCase().trim();
  return EMPLOYEE_LEAVE_TYPES.includes(v as EmployeeLeaveType) ? (v as EmployeeLeaveType) : "other";
}

export function parseLeaveStatus(raw: unknown): EmployeeLeaveStatus | null {
  const v = String(raw ?? "").toLowerCase().trim();
  return EMPLOYEE_LEAVE_STATUSES.includes(v as EmployeeLeaveStatus) ? (v as EmployeeLeaveStatus) : null;
}

export function isValidLeaveDate(ymd: string): boolean {
  return DATE_RE.test(ymd);
}

export function isApprovedLeave(leave: EmployeeLeaveRecord): boolean {
  return leave.status === "approved";
}

/** Only approved leave affects the attendance register and leave-day counts. */
export function approvedLeaveOnly(records: EmployeeLeaveRecord[]): EmployeeLeaveRecord[] {
  return records.filter(isApprovedLeave);
}

/** Count calendar days (EAT) in a leave range, inclusive. */
export function countDaysInLeaveRange(startDate: string, endDate: string): number {
  if (!isValidLeaveDate(startDate) || !isValidLeaveDate(endDate) || endDate < startDate) return 0;
  return eachEatDayKeys(startDate, endDate).length;
}

/** True when dayKey (EAT YYYY-MM-DD) falls within an approved leave record (inclusive). */
export function isDayOnApprovedLeave(dayKey: string, leave: EmployeeLeaveRecord): boolean {
  return isApprovedLeave(leave) && dayKey >= leave.startDate && dayKey <= leave.endDate;
}

/** Find approved leave covering this employee on this day. */
export function findLeaveForEmployeeDay(
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  dayKey: string
): EmployeeLeaveRecord | null {
  for (const leave of leaveRecords) {
    if (leave.employeeId === employeeId && isDayOnApprovedLeave(dayKey, leave)) {
      return leave;
    }
  }
  return null;
}

/** Count distinct EAT days on approved leave for one employee within a report range. */
export function countLeaveDaysForEmployee(
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  fromYmd: string,
  toYmd: string
): number {
  if (!isValidLeaveDate(fromYmd) || !isValidLeaveDate(toYmd)) return 0;
  const employeeLeave = approvedLeaveOnly(leaveRecords.filter((l) => l.employeeId === employeeId));
  if (!employeeLeave.length) return 0;

  let count = 0;
  for (const dayKey of eachEatDayKeys(fromYmd, toYmd)) {
    if (findLeaveForEmployeeDay(employeeLeave, employeeId, dayKey)) count += 1;
  }
  return count;
}

/** Leave records that overlap a query range (inclusive). */
export function leaveOverlapsRange(
  leave: EmployeeLeaveRecord,
  fromYmd: string,
  toYmd: string
): boolean {
  return leave.startDate <= toYmd && leave.endDate >= fromYmd;
}
