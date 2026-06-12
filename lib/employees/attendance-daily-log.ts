import { localDayKey } from "@/lib/employees/daily-attendance-rules";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import { detectShiftForEvent, formatHoursWorked, hoursWorkedBetween, shiftsFromSettings } from "@/lib/employees/shifts";
import type { EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";
import { formatEmployeeReportDate, formatEmployeeReportTime } from "@/lib/employees/utils";
import { eatDayKey } from "@/lib/time/eat";

export type AttendanceDailyLogRow = {
  id: string;
  employeeId: string;
  dayKey: string;
  shiftLabel: string;
  fullName: string;
  memberId: string;
  department: string;
  signInLabel: string;
  signInDate: string;
  signInTime: string;
  signOutLabel: string;
  signOutTime: string;
  hoursWorked: string;
  /** ISO for sorting */
  sortKey: string;
};

function signStatusLabel(present: boolean, kind: "in" | "out"): string {
  if (!present) return "—";
  return kind === "in" ? "Signed in" : "Signed out";
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
 */
export function buildAttendanceDailyLogRows(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[],
  reportingSettings?: EmployeeReportingSettings
): AttendanceDailyLogRow[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const shiftEnabled = reportingSettings?.shiftEnabled === true;
  const shifts = shiftEnabled && reportingSettings ? shiftsFromSettings(reportingSettings) : [];

  const buckets = new Map<string, DayBucket>();

  for (const ev of events) {
    const dayKey = localDayKey(ev.createdAt);
    const shift = shiftEnabled ? detectShiftForEvent(ev.createdAt, shifts) : null;
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

    rows.push({
      id: `${bucket.employeeId}:${bucket.dayKey}:${bucket.shiftKey}`,
      employeeId: bucket.employeeId,
      dayKey: bucket.dayKey,
      shiftLabel: bucket.shiftLabel,
      fullName: emp?.fullName ?? "Unknown",
      memberId: emp?.employeeCode?.trim() || "—",
      department: emp?.department?.trim() || "—",
      signInLabel: signStatusLabel(Boolean(bucket.signInAt), "in"),
      signInDate,
      signInTime,
      signOutLabel: signStatusLabel(Boolean(bucket.signOutAt), "out"),
      signOutTime,
      hoursWorked: hours,
      sortKey: bucket.signInAt ?? bucket.signOutAt ?? `${bucket.dayKey}T00:00:00`,
    });
  }

  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}
