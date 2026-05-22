import { eatDayKey } from "@/lib/time/eat";
import type { EmployeeAttendanceRecord, ShiftDefinition } from "@/lib/employees/types";

/**
 * Multi-shift support for retail/hospitality accounts.
 * Allows employees to sign in/out multiple times per day across shifts.
 * Example: Morning shift (6am-3pm), Evening shift (3:30pm-11pm)
 */

export function parseTimeHHMM(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map((s) => parseInt(s, 10));
  return { hours, minutes: minutes || 0 };
}

export function dateToTimeHHMM(date: Date): { hours: number; minutes: number } {
  return { hours: date.getHours(), minutes: date.getMinutes() };
}

export function compareTime(time1: { hours: number; minutes: number }, time2: { hours: number; minutes: number }): number {
  const mins1 = time1.hours * 60 + time1.minutes;
  const mins2 = time2.hours * 60 + time2.minutes;
  return mins1 - mins2;
}

export function timeIsBetween(
  currentTime: { hours: number; minutes: number },
  startTime: { hours: number; minutes: number },
  endTime: { hours: number; minutes: number }
): boolean {
  return compareTime(currentTime, startTime) >= 0 && compareTime(currentTime, endTime) <= 0;
}

/**
 * Determine which shift an employee is signing in/out for based on current time.
 * Returns shift number (1 or 2) or null if outside all shifts.
 */
export function detectShiftForTime(
  time: { hours: number; minutes: number },
  shifts: ShiftDefinition[]
): ShiftDefinition | null {
  for (const shift of shifts) {
    const startTime = parseTimeHHMM(shift.startTime);
    const endTime = parseTimeHHMM(shift.endTime);
    if (timeIsBetween(time, startTime, endTime)) {
      return shift;
    }
  }
  return null;
}

/**
 * Deduplicate attendance allowing multiple sign-in/out pairs per shift per day.
 * For each employee+day+shift, keep first sign-in and last sign-out.
 */
export function dedupeAttendanceByShift(
  events: EmployeeAttendanceRecord[],
  shiftEnabled: boolean,
  shifts?: ShiftDefinition[]
): EmployeeAttendanceRecord[] {
  if (!shiftEnabled || !shifts || shifts.length === 0) {
    // Fall back to single-shift (daily) deduplication
    return dedupeAttendanceByDay(events);
  }

  const byShift = new Map<string, EmployeeAttendanceRecord[]>();
  for (const e of events) {
    // Detect shift from event timestamp
    const eventTime = dateToTimeHHMM(new Date(e.createdAt));
    const shift = detectShiftForTime(eventTime, shifts);
    const shiftNum = shift?.shiftNumber ?? "unknown";
    const key = `${e.employeeId}:${eatDayKey(e.createdAt)}:${shiftNum}`;
    const list = byShift.get(key) ?? [];
    list.push(e);
    byShift.set(key, list);
  }

  const out: EmployeeAttendanceRecord[] = [];
  for (const list of byShift.values()) {
    const signIns = list
      .filter((e) => e.eventType === "sign_in")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const signOuts = list
      .filter((e) => e.eventType === "sign_out")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (signIns[0]) out.push(signIns[0]);
    if (signOuts.length > 0) out.push(signOuts[signOuts.length - 1]);
  }

  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Single-shift (daily) deduplication: one sign-in + one sign-out per employee per day.
 */
function dedupeAttendanceByDay(events: EmployeeAttendanceRecord[]): EmployeeAttendanceRecord[] {
  const byKey = new Map<string, EmployeeAttendanceRecord[]>();
  for (const e of events) {
    const key = `${e.employeeId}:${eatDayKey(e.createdAt)}`;
    const list = byKey.get(key) ?? [];
    list.push(e);
    byKey.set(key, list);
  }

  const out: EmployeeAttendanceRecord[] = [];
  for (const list of byKey.values()) {
    const signIns = list
      .filter((e) => e.eventType === "sign_in")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const signOuts = list
      .filter((e) => e.eventType === "sign_out")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (signIns[0]) out.push(signIns[0]);
    if (signOuts.length > 0) out.push(signOuts[signOuts.length - 1]);
  }

  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Summarize today's events across all shifts.
 * When shifts are enabled, counts may exceed 1 sign-in/out.
 */
export function summarizeTodayEventsByShift(
  events: EmployeeAttendanceRecord[],
  shiftEnabled: boolean,
  shifts?: ShiftDefinition[]
) {
  const signIns = events.filter((e) => e.eventType === "sign_in");
  const signOuts = events.filter((e) => e.eventType === "sign_out");

  if (!shiftEnabled || !shifts || shifts.length === 0) {
    return {
      signInCount: signIns.length,
      signOutCount: signOuts.length,
      hasSignIn: signIns.length > 0,
      hasSignOut: signOuts.length > 0,
      isCurrentlyIn: signIns.length > signOuts.length,
    };
  }

  // Multi-shift: last event determines current status
  const lastEvent = events[events.length - 1];
  const isCurrentlyIn = lastEvent?.eventType === "sign_in";

  return {
    signInCount: signIns.length,
    signOutCount: signOuts.length,
    hasSignIn: signIns.length > 0,
    hasSignOut: signOuts.length > 0,
    isCurrentlyIn,
    shiftCount: shifts.length,
  };
}

/**
 * Validate shift-aware attendance transition.
 * With shifts enabled, allows multiple sign-in/out pairs per day.
 * Without shifts, enforces single daily sign-in/out pair.
 */
export function validateShiftAttendanceTransition(params: {
  todayEvents: EmployeeAttendanceRecord[];
  nextEvent: "sign_in" | "sign_out";
  shiftEnabled: boolean;
  shifts?: ShiftDefinition[];
  currentTime?: Date;
}): { ok: true } | { ok: false; error: string } {
  const { shiftEnabled, shifts, currentTime = new Date(), nextEvent, todayEvents } = params;

  if (!shiftEnabled || !shifts || shifts.length === 0) {
    // Single-shift mode: enforce one sign-in/out pair per day
    return validateDailyAttendanceTransition({ todayEvents, nextEvent });
  }

  // Multi-shift mode: detect which shift employee is signing in/out for
  const eventTime = dateToTimeHHMM(currentTime);
  const shift = detectShiftForTime(eventTime, shifts);

  if (!shift) {
    return {
      ok: false,
      error: `Current time (${currentTime.toLocaleTimeString()}) is outside all shift windows.`,
    };
  }

  // Find events for this specific shift today
  const shiftEvents = todayEvents.filter((e) => {
    const eTime = dateToTimeHHMM(new Date(e.createdAt));
    const eShift = detectShiftForTime(eTime, shifts);
    return eShift?.shiftNumber === shift.shiftNumber;
  });

  const shiftSignIns = shiftEvents.filter((e) => e.eventType === "sign_in");
  const shiftSignOuts = shiftEvents.filter((e) => e.eventType === "sign_out");
  const shiftStatus = shiftSignIns.length > shiftSignOuts.length ? "in" : "out";

  if (nextEvent === "sign_in") {
    if (shiftStatus === "in") {
      return {
        ok: false,
        error: `Already signed in for Shift ${shift.shiftNumber}. Please sign out first.`,
      };
    }
  } else {
    // sign_out
    if (shiftStatus === "out") {
      return {
        ok: false,
        error: `Not signed in for Shift ${shift.shiftNumber}. Please sign in first.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Single-shift daily validation (fallback when shifts disabled).
 */
function validateDailyAttendanceTransition(params: {
  todayEvents: EmployeeAttendanceRecord[];
  nextEvent: "sign_in" | "sign_out";
}): { ok: true } | { ok: false; error: string } {
  const { todayEvents, nextEvent } = params;
  const signIns = todayEvents.filter((e) => e.eventType === "sign_in");
  const signOuts = todayEvents.filter((e) => e.eventType === "sign_out");
  const currentStatus = signIns.length > signOuts.length ? "in" : "out";

  if (nextEvent === "sign_in") {
    if (currentStatus === "in") {
      return { ok: false, error: "Already signed in today. Please sign out first." };
    }
  } else {
    if (currentStatus === "out") {
      return { ok: false, error: "Not signed in. Please sign in first." };
    }
  }

  return { ok: true };
}
