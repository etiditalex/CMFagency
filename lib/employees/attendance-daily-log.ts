import { localDayKey } from "@/lib/employees/daily-attendance-rules";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import type { EmployeeRecord } from "@/lib/employees/types";
import { formatEmployeeReportDate, formatEmployeeReportTime } from "@/lib/employees/utils";
import { eatDayKey } from "@/lib/time/eat";

export type AttendanceDailyLogRow = {
  id: string;
  employeeId: string;
  dayKey: string;
  fullName: string;
  memberId: string;
  department: string;
  signInLabel: string;
  signInDate: string;
  signInTime: string;
  signOutLabel: string;
  signOutTime: string;
  /** ISO for sorting */
  sortKey: string;
};

function signStatusLabel(present: boolean, kind: "in" | "out"): string {
  if (!present) return "—";
  return kind === "in" ? "Signed in" : "Signed out";
}

/**
 * One row per employee per calendar day (EAT) with sign-in and sign-out columns side by side.
 */
export function buildAttendanceDailyLogRows(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[]
): AttendanceDailyLogRow[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  type DayBucket = {
    employeeId: string;
    dayKey: string;
    signInAt: string | null;
    signOutAt: string | null;
  };

  const buckets = new Map<string, DayBucket>();

  for (const ev of events) {
    const dayKey = localDayKey(ev.createdAt);
    const key = `${ev.employeeId}:${dayKey}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { employeeId: ev.employeeId, dayKey, signInAt: null, signOutAt: null };
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

    rows.push({
      id: `${bucket.employeeId}:${bucket.dayKey}`,
      employeeId: bucket.employeeId,
      dayKey: bucket.dayKey,
      fullName: emp?.fullName ?? "Unknown",
      memberId: emp?.employeeCode?.trim() || "—",
      department: emp?.department?.trim() || "—",
      signInLabel: signStatusLabel(Boolean(bucket.signInAt), "in"),
      signInDate,
      signInTime,
      signOutLabel: signStatusLabel(Boolean(bucket.signOutAt), "out"),
      signOutTime,
      sortKey: bucket.signInAt ?? bucket.signOutAt ?? `${bucket.dayKey}T00:00:00`,
    });
  }

  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}
