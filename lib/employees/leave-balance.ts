import {
  countDaysInLeaveRange,
  parseLeaveType,
} from "@/lib/employees/leave-rules";
import type { EmployeeLeaveRecord, EmployeeLeaveType, EmployeeLeaveAllocation } from "@/lib/employees/types";
import { eachEatDayKeys } from "@/lib/time/eat";

export const DEFAULT_LEAVE_ALLOCATION_DAYS: Record<EmployeeLeaveType, number | null> = {
  annual: 21,
  sick: 14,
  compassionate: 5,
  unpaid: null,
  other: 0,
};

export type LeaveAllocationBalance = {
  allocated: number | null;
  used: number;
  remaining: number | null;
};

export type EmployeeLeaveAllocationRow = {
  annual: LeaveAllocationBalance;
  sick: LeaveAllocationBalance;
  compassionate: LeaveAllocationBalance;
  unpaid: LeaveAllocationBalance;
  other: LeaveAllocationBalance;
};

export type EmployeeLeaveAllocationView = {
  employeeId: string;
  fullName: string;
  department: string;
  employeeCode: string | null;
  leaveYear: number;
  allocation: EmployeeLeaveAllocation;
  balances: EmployeeLeaveAllocationRow;
};

function clampDays(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 10) / 10;
}

function clampNullableDays(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  return clampDays(value, fallback ?? 0);
}

export function currentLeaveYear(): number {
  return new Date().getFullYear();
}

export function allocationDaysForType(
  allocation: EmployeeLeaveAllocation,
  leaveType: EmployeeLeaveType
): number | null {
  switch (leaveType) {
    case "annual":
      return allocation.annualDays;
    case "sick":
      return allocation.sickDays;
    case "compassionate":
      return allocation.compassionateDays;
    case "unpaid":
      return allocation.unpaidDays;
    case "other":
      return allocation.otherDays;
    default:
      return allocation.otherDays;
  }
}

export function defaultAllocationForEmployee(employeeId: string, leaveYear: number): EmployeeLeaveAllocation {
  return {
    id: null,
    employeeId,
    leaveYear,
    annualDays: DEFAULT_LEAVE_ALLOCATION_DAYS.annual ?? 0,
    sickDays: DEFAULT_LEAVE_ALLOCATION_DAYS.sick ?? 0,
    compassionateDays: DEFAULT_LEAVE_ALLOCATION_DAYS.compassionate ?? 0,
    unpaidDays: DEFAULT_LEAVE_ALLOCATION_DAYS.unpaid,
    otherDays: DEFAULT_LEAVE_ALLOCATION_DAYS.other ?? 0,
    updatedAt: null,
  };
}

export function normalizeAllocationInput(
  employeeId: string,
  leaveYear: number,
  raw: Record<string, unknown>
): EmployeeLeaveAllocation {
  const defaults = defaultAllocationForEmployee(employeeId, leaveYear);
  return {
    id: typeof raw.id === "string" ? raw.id : null,
    employeeId,
    leaveYear,
    annualDays: clampDays(raw.annualDays ?? raw.annual_days, defaults.annualDays),
    sickDays: clampDays(raw.sickDays ?? raw.sick_days, defaults.sickDays),
    compassionateDays: clampDays(
      raw.compassionateDays ?? raw.compassionate_days,
      defaults.compassionateDays
    ),
    unpaidDays: clampNullableDays(raw.unpaidDays ?? raw.unpaid_days, defaults.unpaidDays),
    otherDays: clampDays(raw.otherDays ?? raw.other_days, defaults.otherDays),
    updatedAt: null,
  };
}

function leaveDaysInYear(leave: EmployeeLeaveRecord, year: number): number {
  if (leave.status !== "approved") return 0;
  let count = 0;
  for (const dayKey of eachEatDayKeys(leave.startDate, leave.endDate)) {
    if (dayKey.startsWith(`${year}-`)) count += 1;
  }
  return count;
}

export function sumApprovedLeaveDaysForType(
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  leaveType: EmployeeLeaveType,
  leaveYear: number,
  excludeLeaveId?: string
): number {
  return leaveRecords
    .filter(
      (leave) =>
        leave.employeeId === employeeId &&
        leave.leaveType === leaveType &&
        leave.status === "approved" &&
        leave.id !== excludeLeaveId
    )
    .reduce((sum, leave) => sum + leaveDaysInYear(leave, leaveYear), 0);
}

export function buildLeaveBalance(
  allocation: EmployeeLeaveAllocation,
  leaveType: EmployeeLeaveType,
  usedDays: number
): LeaveAllocationBalance {
  const allocated = allocationDaysForType(allocation, leaveType);
  if (allocated === null) {
    return { allocated: null, used: usedDays, remaining: null };
  }
  return {
    allocated,
    used: usedDays,
    remaining: Math.max(0, Math.round((allocated - usedDays) * 10) / 10),
  };
}

export function buildEmployeeLeaveBalances(
  allocation: EmployeeLeaveAllocation,
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  leaveYear: number,
  excludeLeaveId?: string
): EmployeeLeaveAllocationRow {
  const types: EmployeeLeaveType[] = ["annual", "sick", "compassionate", "unpaid", "other"];
  const balances = {} as EmployeeLeaveAllocationRow;
  for (const type of types) {
    const used = sumApprovedLeaveDaysForType(
      leaveRecords,
      employeeId,
      type,
      leaveYear,
      excludeLeaveId
    );
    balances[type] = buildLeaveBalance(allocation, type, used);
  }
  return balances;
}

export function validateLeaveAgainstBalance(
  allocation: EmployeeLeaveAllocation,
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  leaveType: EmployeeLeaveType,
  startDate: string,
  endDate: string,
  excludeLeaveId?: string
): { ok: true } | { ok: false; error: string } {
  const requestedDays = countDaysInLeaveRange(startDate, endDate);
  if (requestedDays <= 0) {
    return { ok: false, error: "Leave must include at least one day." };
  }

  const allocated = allocationDaysForType(allocation, leaveType);
  if (allocated === null) return { ok: true };

  const used = sumApprovedLeaveDaysForType(
    leaveRecords,
    employeeId,
    leaveType,
    allocation.leaveYear,
    excludeLeaveId
  );
  const remaining = allocated - used;
  if (requestedDays > remaining + 0.001) {
    return {
      ok: false,
      error: `Insufficient ${leaveType} leave balance. Requested ${requestedDays} day(s) but only ${Math.max(0, Math.round(remaining * 10) / 10)} day(s) remain of ${allocated} allocated.`,
    };
  }
  return { ok: true };
}

export function parseAllocationLeaveType(raw: unknown): EmployeeLeaveType {
  return parseLeaveType(raw);
}
