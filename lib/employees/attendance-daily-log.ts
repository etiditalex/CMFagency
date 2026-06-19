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

/**
 * One row per employee per calendar day (EAT), or per shift when shift reporting is enabled.
 * Merges approved leave days so employees on leave appear in the register even without scans.
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

  const buckets = new Map<string, DayBucket>();
  const attendedEmployeeDays = new Set<string>();
  const eventsByEmployeeDay = new Map<string, AttendanceSummaryEventRow[]>();

  for (const ev of events) {
    const dayKey = localDayKey(ev.createdAt);
    const dayEventsKey = `${ev.employeeId}:${dayKey}`;
    const dayList = eventsByEmployeeDay.get(dayEventsKey) ?? [];
    dayList.push(ev);
    eventsByEmployeeDay.set(dayEventsKey, dayList);
  }

  for (const ev of events) {
    const dayKey = localDayKey(ev.createdAt);
    attendedEmployeeDays.add(`${ev.employeeId}:${dayKey}`);
    const dayEvents = (eventsByEmployeeDay.get(`${ev.employeeId}:${dayKey}`) ?? []).map(
      (e): EmployeeAttendanceRecord => ({
        id: e.id,
        employeeId: e.employeeId,
        eventType: e.eventType,
        deviceId: null,
        deviceLabel: null,
        deviceInfo: {},
        createdAt: e.createdAt,
        shiftNumber: e.shiftNumber ?? null,
      })
    );
    const shift = shiftEnabled
      ? resolveShiftForAttendanceEvent(
          {
            createdAt: ev.createdAt,
            eventType: ev.eventType,
            employeeId: ev.employeeId,
            shiftNumber: ev.shiftNumber ?? null,
          },
          shifts,
          dayEvents
        )
      : null;
    const shiftKey = shift ? String(shift.shiftNumber) : "day";
    const shiftLabel = shift ? `Shift ${shift.shiftNumber}` : "—";
    const key = `${ev.employeeId}:${dayKey}:${shiftKey}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { employeeId: ev.employeeId, dayKey, shiftKey, shiftLabel, signInAt: null, signOutAt: null };
      buckets.set(key, bucket);
    }
    if (ev.eventType === "sign_in") {
      if (!bucket.signInAt || ev.createdAt < bucket.signInAt) bucket.signInAt = ev.createdAt;
    } else if (!bucket.signOutAt || ev.createdAt > bucket.signOutAt) {
      bucket.signOutAt = ev.createdAt;
    }
  }

  const rows: AttendanceDailyLogRow[] = [];

  for (const bucket of buckets.values()) {
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
      id: `${bucket.employeeId}:${bucket.dayKey}:${bucket.shiftKey}`,
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
  const from = options?.from?.trim() ?? "";
  const to = options?.to?.trim() ?? "";
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
