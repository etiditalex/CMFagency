import { format, isValid, parseISO } from "date-fns";

import { dedupeAttendanceByEmployeeDay, localDayKey } from "@/lib/employees/daily-attendance-rules";
import { dedupeAttendanceByShift } from "@/lib/employees/shift-attendance-rules";
import { shiftsFromSettings } from "@/lib/employees/shifts";
import { formatReportingTime } from "@/lib/employees/reporting-time";
import { formatCheckInEmailDateTime } from "@/lib/visitors/format-check-in-display";
import {
  eachEatDayKeys,
  eatDaySpanInclusive,
  eatHourFromIso,
  eatMinutesFromIso,
  eatRangeBoundsUtc,
  formatEatHourLabel,
} from "@/lib/time/eat";
import type {
  EmployeeAttendanceEventType,
  EmployeeAttendanceRecord,
  EmployeeMemberType,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";

export type AttendanceSummaryDailyPoint = {
  date: string;
  label: string;
  signIns: number;
  signOuts: number;
};

export type AttendanceSummaryHourlyPoint = {
  hour: number;
  label: string;
  signIns: number;
  signOuts: number;
};

export type AttendanceSummaryEmployeeRow = {
  employeeId: string;
  fullName: string;
  department: string;
  jobTitle: string;
  memberType: string;
  signInCount: number;
  signOutCount: number;
  daysAttended: number;
  firstSignIn: string | null;
  lastSignOut: string | null;
  avgFirstSignInMinutes: number | null;
};

export type AttendanceSummaryRankEntry = {
  rank: number;
  employeeId: string;
  fullName: string;
  department: string;
  memberType: EmployeeMemberType;
  metric: string;
  detail: string;
};

export type AttendanceSummaryTeamRankings = {
  mostAttendant: AttendanceSummaryRankEntry[];
  earliestArrival: AttendanceSummaryRankEntry[];
};

export type AttendanceSummaryRankings = {
  staff: AttendanceSummaryTeamRankings;
  crm: AttendanceSummaryTeamRankings;
};

export type AttendanceSummaryEventRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  eventType: EmployeeAttendanceEventType;
  eventLabel: string;
  createdAt: string;
  displayTime: string;
  displayDate: string;
};

export type AttendanceSummaryPayload = {
  from: string;
  to: string;
  generatedAt: string;
  totals: {
    signIns: number;
    signOuts: number;
    events: number;
    rawEvents: number;
    duplicatesOmitted: number;
    uniqueEmployees: number;
  };
  dailySeries: AttendanceSummaryDailyPoint[];
  hourlySeries: AttendanceSummaryHourlyPoint[];
  employeeSummaries: AttendanceSummaryEmployeeRow[];
  rankings: AttendanceSummaryRankings;
  events: AttendanceSummaryEventRow[];
  /** Human-readable "generated at" in EAT. */
  generatedAtDisplay: string;
  timezoneLabel: "EAT";
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseAttendanceSummaryDateRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined
): { from: string; to: string; fromDate: Date; toDate: Date } | { error: string } {
  const from = String(fromRaw ?? "").trim();
  const to = String(toRaw ?? "").trim();
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return { error: "Use valid from and to dates (YYYY-MM-DD)." };
  }
  const bounds = eatRangeBoundsUtc(from, to);
  if (!bounds) {
    return { error: "Invalid date range." };
  }
  const { fromDate, toDate } = bounds;
  if (!isValid(fromDate) || !isValid(toDate)) {
    return { error: "Invalid date range." };
  }
  if (from > to) {
    return { error: "Start date must be on or before end date." };
  }
  const spanDays = eatDaySpanInclusive(from, to);
  if (spanDays > 366) {
    return { error: "Maximum range is 366 days." };
  }
  return { from, to, fromDate, toDate };
}

function eventLabel(type: EmployeeAttendanceEventType): string {
  return type === "sign_in" ? "Sign in" : "Sign out";
}

function minutesFromMidnight(iso: string): number {
  return eatMinutesFromIso(iso) ?? 0;
}

function minutesToTime24(avgMinutes: number): string {
  const h = Math.floor(avgMinutes / 60) % 24;
  const m = Math.round(avgMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const RANK_LIMIT = 10;

function buildTeamRankings(
  rows: AttendanceSummaryEmployeeRow[],
  memberType: EmployeeMemberType
): AttendanceSummaryTeamRankings {
  const team = rows.filter((r) => r.memberType === memberType);

  const mostAttendant = [...team]
    .filter((r) => r.daysAttended > 0)
    .sort((a, b) => {
      if (b.daysAttended !== a.daysAttended) return b.daysAttended - a.daysAttended;
      return b.signInCount - a.signInCount;
    })
    .slice(0, RANK_LIMIT)
    .map((r, i) => ({
      rank: i + 1,
      employeeId: r.employeeId,
      fullName: r.fullName,
      department: r.department,
      memberType,
      metric: `${r.daysAttended} day${r.daysAttended === 1 ? "" : "s"}`,
      detail: `${r.signInCount} sign-in · ${r.signOutCount} sign-out (deduped)`,
    }));

  const earliestArrival = [...team]
    .filter((r) => r.avgFirstSignInMinutes !== null)
    .sort((a, b) => (a.avgFirstSignInMinutes ?? 9999) - (b.avgFirstSignInMinutes ?? 9999))
    .slice(0, RANK_LIMIT)
    .map((r, i) => {
      const t24 = minutesToTime24(r.avgFirstSignInMinutes!);
      return {
        rank: i + 1,
        employeeId: r.employeeId,
        fullName: r.fullName,
        department: r.department,
        memberType,
        metric: formatReportingTime(t24),
        detail: `Avg first sign-in (${r.daysAttended} day${r.daysAttended === 1 ? "" : "s"})`,
      };
    });

  return { mostAttendant, earliestArrival };
}

export function buildAttendanceSummary(params: {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  attendance: EmployeeAttendanceRecord[];
  employees: EmployeeRecord[];
  formatDisplayTime: (iso: string) => string;
  formatDisplayDate: (iso: string) => string;
  reportingSettings?: EmployeeReportingSettings;
}): AttendanceSummaryPayload {
  const employeeById = new Map(params.employees.map((e) => [e.id, e]));
  const rawInRange = params.attendance.filter((a) => {
    const t = new Date(a.createdAt).getTime();
    return t >= params.fromDate.getTime() && t <= params.toDate.getTime();
  });
  const shiftEnabled = params.reportingSettings?.shiftEnabled === true;
  const shifts =
    shiftEnabled && params.reportingSettings
      ? shiftsFromSettings(params.reportingSettings)
      : undefined;
  const inRange = shiftEnabled
    ? dedupeAttendanceByShift(rawInRange, true, shifts)
    : dedupeAttendanceByEmployeeDay(rawInRange);

  const dailyMap = new Map<string, { signIns: number; signOuts: number }>();
  for (const key of eachEatDayKeys(params.from, params.to)) {
    dailyMap.set(key, { signIns: 0, signOuts: 0 });
  }

  const hourlyMap = new Map<number, { signIns: number; signOuts: number }>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { signIns: 0, signOuts: 0 });
  }

  const perEmployee = new Map<
    string,
    {
      signInCount: number;
      signOutCount: number;
      daysAttended: Set<string>;
      firstSignInMinutesByDay: number[];
      firstSignIn: string | null;
      lastSignOut: string | null;
    }
  >();

  let signIns = 0;
  let signOuts = 0;

  for (const a of inRange) {
    const chartDayKey = localDayKey(a.createdAt);
    const hour = eatHourFromIso(a.createdAt);
    if (!dailyMap.has(chartDayKey)) dailyMap.set(chartDayKey, { signIns: 0, signOuts: 0 });
    const dayBucket = dailyMap.get(chartDayKey)!;
    const hourBucket = hourlyMap.get(hour)!;

    if (a.eventType === "sign_in") {
      signIns += 1;
      dayBucket.signIns += 1;
      hourBucket.signIns += 1;
    } else {
      signOuts += 1;
      dayBucket.signOuts += 1;
      hourBucket.signOuts += 1;
    }

    let row = perEmployee.get(a.employeeId);
    if (!row) {
      row = {
        signInCount: 0,
        signOutCount: 0,
        daysAttended: new Set(),
        firstSignInMinutesByDay: [],
        firstSignIn: null,
        lastSignOut: null,
      };
      perEmployee.set(a.employeeId, row);
    }
    const dayKey = localDayKey(a.createdAt);
    if (a.eventType === "sign_in") {
      row.signInCount += 1;
      row.daysAttended.add(dayKey);
      row.firstSignInMinutesByDay.push(minutesFromMidnight(a.createdAt));
      if (!row.firstSignIn || a.createdAt < row.firstSignIn) row.firstSignIn = a.createdAt;
    } else {
      row.signOutCount += 1;
      if (!row.lastSignOut || a.createdAt > row.lastSignOut) row.lastSignOut = a.createdAt;
    }
  }

  const dailySeries: AttendanceSummaryDailyPoint[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      label: format(parseISO(date), "d MMM"),
      signIns: counts.signIns,
      signOuts: counts.signOuts,
    }));

  const hourlySeries: AttendanceSummaryHourlyPoint[] = [...hourlyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, counts]) => ({
      hour,
      label: formatEatHourLabel(hour),
      signIns: counts.signIns,
      signOuts: counts.signOuts,
    }));

  const employeeSummaries: AttendanceSummaryEmployeeRow[] = [...perEmployee.entries()]
    .map(([employeeId, stats]) => {
      const emp = employeeById.get(employeeId);
      const avgFirstSignInMinutes =
        stats.firstSignInMinutesByDay.length > 0
          ? Math.round(
              stats.firstSignInMinutesByDay.reduce((s, m) => s + m, 0) /
                stats.firstSignInMinutesByDay.length
            )
          : null;
      return {
        employeeId,
        fullName: emp?.fullName ?? "Unknown",
        department: emp?.department ?? "",
        jobTitle: emp?.jobTitle ?? "",
        memberType: emp?.memberType ?? "staff",
        signInCount: stats.signInCount,
        signOutCount: stats.signOutCount,
        daysAttended: stats.daysAttended.size,
        firstSignIn: stats.firstSignIn,
        lastSignOut: stats.lastSignOut,
        avgFirstSignInMinutes,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const rankings: AttendanceSummaryRankings = {
    staff: buildTeamRankings(employeeSummaries, "staff"),
    crm: buildTeamRankings(employeeSummaries, "crm"),
  };

  const events: AttendanceSummaryEventRow[] = inRange
    .map((a) => {
      const emp = employeeById.get(a.employeeId);
      return {
        id: a.id,
        employeeId: a.employeeId,
        employeeName: emp?.fullName ?? "Unknown",
        eventType: a.eventType,
        eventLabel: eventLabel(a.eventType),
        createdAt: a.createdAt,
        displayTime: params.formatDisplayTime(a.createdAt),
        displayDate: params.formatDisplayDate(a.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    from: params.from,
    to: params.to,
    generatedAt: new Date().toISOString(),
    totals: {
      signIns,
      signOuts,
      events: inRange.length,
      rawEvents: rawInRange.length,
      duplicatesOmitted: Math.max(0, rawInRange.length - inRange.length),
      uniqueEmployees: perEmployee.size,
    },
    dailySeries,
    hourlySeries,
    employeeSummaries,
    rankings,
    events,
    generatedAtDisplay: formatCheckInEmailDateTime(new Date().toISOString()),
    timezoneLabel: "EAT",
  };
}
