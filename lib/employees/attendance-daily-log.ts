import { localDayKey } from "@/lib/employees/daily-attendance-rules";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import { findLeaveForEmployeeDay, leaveTypeLabel } from "@/lib/employees/leave-rules";
import {
  formatHoursWorked,
  hoursWorkedBetween,
  resolveShiftForAttendanceEvent,
  shiftsFromSettings,
} from "@/lib/employees/shifts";
import {
  signOutReportingStatus,
  signOutStatusLabel,
  reportingWindowForMember,
} from "@/lib/employees/reporting-time";
import type { EmployeeAttendanceRecord, EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";
import { formatEmployeeReportDate, formatEmployeeReportTime } from "@/lib/employees/utils";
import { eachEatDayKeys, eatDayKey } from "@/lib/time/eat";

export type AttendanceDailyLogStatus = "present" | "on_leave";

export type AttendanceDailyLogRow = {
  id: string;
  employeeId: string;
  dayKey: string;
  shiftLabel: string;
  fullName: string;
  memberId: string;
  department: string;
  status: AttendanceDailyLogStatus;
  leaveType: string;
  signInLabel: string;
  signInDate: string;
  signInTime: string;
  signOutLabel: string;
  signOutTime: string;
  hoursWorked: string;
  /** ISO for sorting */
  sortKey: string;
};

export type AttendanceDailyLogOptions = {
  leaveRecords?: EmployeeLeaveRecord[];
  from?: string;
  to?: string;
  /** Retail/hospitality: sign-out after required time is labelled Overtime. */
  labelSignOutOvertime?: boolean;
};

function signStatusLabel(present: boolean, kind: "in" | "out"): string {
  if (!present) return "—";
  return kind === "in" ? "Signed in" : "Signed out";
}

function dayKeyToDisplayDate(dayKey: string): string {
  return formatEmployeeReportDate(`${dayKey}T12:00:00+03:00`);
}

type DayBucket = {
  employeeId: string;
  dayKey: string;
  shiftKey: string;
  shiftLabel: string;
  signInAt: string | null;
  signOutAt: string | null;
};

function toAttendanceRecord(e: AttendanceSummaryEventRow): EmployeeAttendanceRecord {
  return {
    id: e.id,
    employeeId: e.employeeId,
    eventType: e.eventType,
    deviceId: null,
    deviceLabel: null,
    deviceInfo: {},
    createdAt: e.createdAt,
    shiftNumber: e.shiftNumber ?? null,
  };
}

/**
 * Pair sign-in/out chronologically so an overnight sign-out closes the prior day's
 * open session (hours land on the sign-in day).
 */
function buildSessionBuckets(
  events: AttendanceSummaryEventRow[],
  shiftEnabled: boolean,
  shifts: ReturnType<typeof shiftsFromSettings>
): DayBucket[] {
  const byEmployee = new Map<string, AttendanceSummaryEventRow[]>();
  for (const ev of events) {
    const list = byEmployee.get(ev.employeeId) ?? [];
    list.push(ev);
    byEmployee.set(ev.employeeId, list);
  }

  const buckets: DayBucket[] = [];

  for (const [employeeId, empEvents] of byEmployee) {
    const sorted = [...empEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const dayEventsByKey = new Map<string, EmployeeAttendanceRecord[]>();
    for (const ev of sorted) {
      const dayKey = localDayKey(ev.createdAt);
      const list = dayEventsByKey.get(dayKey) ?? [];
      list.push(toAttendanceRecord(ev));
      dayEventsByKey.set(dayKey, list);
    }

    let open: DayBucket | null = null;

    const commitOpen = (signOutAt: string | null) => {
      if (!open) return;
      buckets.push({ ...open, signOutAt });
      open = null;
    };

    for (const ev of sorted) {
      const dayKey = localDayKey(ev.createdAt);
      const dayEvents = dayEventsByKey.get(dayKey) ?? [];
      const shift = shiftEnabled
        ? resolveShiftForAttendanceEvent(toAttendanceRecord(ev), shifts, dayEvents)
        : null;
      const shiftKey = shift ? String(shift.shiftNumber) : "day";
      const shiftLabel = shift ? `Shift ${shift.shiftNumber}` : "—";

      if (ev.eventType === "sign_in") {
        if (open) commitOpen(null);
        open = {
          employeeId,
          dayKey,
          shiftKey,
          shiftLabel,
          signInAt: ev.createdAt,
          signOutAt: null,
        };
      } else if (open) {
        // Sign-out closes the open session (may be a prior calendar day).
        commitOpen(ev.createdAt);
      }
      // Orphan sign-out with no open session is ignored.
    }

    if (open) commitOpen(null);
  }

  return buckets;
}

/**
 * One row per employee per calendar day (EAT), or per shift when shift reporting is enabled.
 * Merges approved leave days so employees on leave appear in the register even without scans.
 * Overnight sign-outs are attributed to the sign-in day for hours worked.
 */
export function buildAttendanceDailyLogRows(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[],
  reportingSettings?: EmployeeReportingSettings,
  options?: AttendanceDailyLogOptions
): AttendanceDailyLogRow[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const shiftEnabled = reportingSettings?.shiftEnabled === true;
  const shifts = shiftEnabled && reportingSettings ? shiftsFromSettings(reportingSettings) : [];
  const labelSignOutOvertime =
    options?.labelSignOutOvertime === true || reportingSettings?.shiftEnabled === true;

  const buckets = buildSessionBuckets(events, shiftEnabled, shifts);
  const attendedEmployeeDays = new Set(
    buckets.map((b) => `${b.employeeId}:${b.dayKey}`)
  );

  const from = options?.from?.trim() ?? "";
  const to = options?.to?.trim() ?? "";
  const inRange = (dayKey: string) => {
    if (!from || !to) return true;
    return dayKey >= from && dayKey <= to;
  };

  const rows: AttendanceDailyLogRow[] = [];

  for (const bucket of buckets) {
    if (!inRange(bucket.dayKey)) continue;

    const emp = employeeById.get(bucket.employeeId);
    const signInDate = bucket.signInAt ? formatEmployeeReportDate(bucket.signInAt) : "—";
    const signInTime = bucket.signInAt ? formatEmployeeReportTime(bucket.signInAt) : "—";
    const signOutTimeRaw = bucket.signOutAt ? formatEmployeeReportTime(bucket.signOutAt) : "—";
    const signOutDay = bucket.signOutAt ? eatDayKey(bucket.signOutAt) : "";
    const signInDay = bucket.signInAt ? eatDayKey(bucket.signInAt) : bucket.dayKey;
    const signOutDateOnly = bucket.signOutAt ? formatEmployeeReportDate(bucket.signOutAt) : "";
    const signOutTime =
      bucket.signOutAt && signOutDay && signOutDay !== signInDay
        ? `${signOutDateOnly} · ${signOutTimeRaw}`
        : signOutTimeRaw;

    const hours =
      bucket.signInAt && bucket.signOutAt
        ? formatHoursWorked(hoursWorkedBetween(bucket.signInAt, bucket.signOutAt))
        : "—";

    const signOutLabel = (() => {
      if (!bucket.signOutAt) return "—";
      if (!labelSignOutOvertime || !reportingSettings) return signStatusLabel(true, "out");
      const shiftDef = shifts.find((s) => s.shiftNumber === Number(bucket.shiftKey));
      const expectedSignOut =
        shiftDef?.signOutTime ??
        (emp ? reportingWindowForMember(reportingSettings, emp.memberType).signOut : null);
      if (!expectedSignOut) return signStatusLabel(true, "out");
      const status = signOutReportingStatus(bucket.signOutAt, expectedSignOut, {
        labelOvertime: true,
      });
      if (status === "overtime") return signOutStatusLabel(status);
      return signStatusLabel(true, "out");
    })();

    rows.push({
      id: `${bucket.employeeId}:${bucket.dayKey}:${bucket.shiftKey}:${bucket.signInAt ?? "open"}`,
      employeeId: bucket.employeeId,
      dayKey: bucket.dayKey,
      shiftLabel: bucket.shiftLabel,
      fullName: emp?.fullName ?? "Unknown",
      memberId: emp?.employeeCode?.trim() || "—",
      department: emp?.department?.trim() || "—",
      status: "present",
      leaveType: "—",
      signInLabel: signStatusLabel(Boolean(bucket.signInAt), "in"),
      signInDate,
      signInTime,
      signOutLabel,
      signOutTime,
      hoursWorked: hours,
      sortKey: bucket.signInAt ?? bucket.signOutAt ?? `${bucket.dayKey}T00:00:00`,
    });
  }

  const leaveRecords = options?.leaveRecords ?? [];
  if (leaveRecords.length > 0 && from && to) {
    const dayKeys = eachEatDayKeys(from, to);
    const activeEmployees = employees.filter((e) => e.status === "active");

    for (const emp of activeEmployees) {
      for (const dayKey of dayKeys) {
        if (attendedEmployeeDays.has(`${emp.id}:${dayKey}`)) continue;

        const leave = findLeaveForEmployeeDay(leaveRecords, emp.id, dayKey);
        if (!leave) continue;

        rows.push({
          id: `leave:${emp.id}:${dayKey}`,
          employeeId: emp.id,
          dayKey,
          shiftLabel: "—",
          fullName: emp.fullName,
          memberId: emp.employeeCode?.trim() || "—",
          department: emp.department?.trim() || "—",
          status: "on_leave",
          leaveType: leaveTypeLabel(leave.leaveType),
          signInLabel: "On leave",
          signInDate: dayKeyToDisplayDate(dayKey),
          signInTime: "—",
          signOutLabel: "—",
          signOutTime: "—",
          hoursWorked: "—",
          sortKey: `${dayKey}T00:00:00`,
        });
      }
    }
  }

  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}
