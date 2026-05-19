import {
  eachDayOfInterval,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

import type {
  EmployeeAttendanceEventType,
  EmployeeAttendanceRecord,
  EmployeeRecord,
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
  firstSignIn: string | null;
  lastSignOut: string | null;
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
    uniqueEmployees: number;
  };
  dailySeries: AttendanceSummaryDailyPoint[];
  hourlySeries: AttendanceSummaryHourlyPoint[];
  employeeSummaries: AttendanceSummaryEmployeeRow[];
  events: AttendanceSummaryEventRow[];
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
  const fromDate = startOfDay(parseISO(from));
  const toDate = endOfDay(parseISO(to));
  if (!isValid(fromDate) || !isValid(toDate)) {
    return { error: "Invalid date range." };
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return { error: "Start date must be on or before end date." };
  }
  const spanDays =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays > 366) {
    return { error: "Maximum range is 366 days." };
  }
  return { from, to, fromDate, toDate };
}

function eventLabel(type: EmployeeAttendanceEventType): string {
  return type === "sign_in" ? "Sign in" : "Sign out";
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
}): AttendanceSummaryPayload {
  const employeeById = new Map(params.employees.map((e) => [e.id, e]));
  const inRange = params.attendance.filter((a) => {
    const t = new Date(a.createdAt).getTime();
    return t >= params.fromDate.getTime() && t <= params.toDate.getTime();
  });

  const dailyMap = new Map<string, { signIns: number; signOuts: number }>();
  for (const day of eachDayOfInterval({ start: params.fromDate, end: params.toDate })) {
    const key = format(day, "yyyy-MM-dd");
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
      firstSignIn: string | null;
      lastSignOut: string | null;
    }
  >();

  let signIns = 0;
  let signOuts = 0;

  for (const a of inRange) {
    const d = new Date(a.createdAt);
    const dayKey = format(d, "yyyy-MM-dd");
    const hour = d.getHours();
    if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { signIns: 0, signOuts: 0 });
    const dayBucket = dailyMap.get(dayKey)!;
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
      row = { signInCount: 0, signOutCount: 0, firstSignIn: null, lastSignOut: null };
      perEmployee.set(a.employeeId, row);
    }
    if (a.eventType === "sign_in") {
      row.signInCount += 1;
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
      label: format(new Date(2000, 0, 1, hour, 0), "ha").toLowerCase(),
      signIns: counts.signIns,
      signOuts: counts.signOuts,
    }));

  const employeeSummaries: AttendanceSummaryEmployeeRow[] = [...perEmployee.entries()]
    .map(([employeeId, stats]) => {
      const emp = employeeById.get(employeeId);
      return {
        employeeId,
        fullName: emp?.fullName ?? "Unknown",
        department: emp?.department ?? "",
        jobTitle: emp?.jobTitle ?? "",
        memberType: emp?.memberType ?? "staff",
        signInCount: stats.signInCount,
        signOutCount: stats.signOutCount,
        firstSignIn: stats.firstSignIn,
        lastSignOut: stats.lastSignOut,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

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
      uniqueEmployees: perEmployee.size,
    },
    dailySeries,
    hourlySeries,
    employeeSummaries,
    events,
  };
}
