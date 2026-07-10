import { eatDayKey } from "@/lib/time/eat";
import {
  hasOpenOvernightSession,
  validateDailyAttendanceTransition,
} from "@/lib/employees/daily-attendance-rules";
import type { EmployeeAttendanceRecord, ShiftDefinition } from "@/lib/employees/types";
import { resolveShiftForAttendanceEvent, detectShiftForEvent } from "@/lib/employees/shifts";

/**
 * Multi-shift support for retail/hospitality accounts.
 * Allows employees to sign in/out multiple times per day across shifts.
 * Example: Morning shift (6am-3pm), Evening shift (3pm-11pm)
 */

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
    return dedupeAttendanceByDay(events);
  }

  const byShift = new Map<string, EmployeeAttendanceRecord[]>();
  const byDay = new Map<string, EmployeeAttendanceRecord[]>();
  for (const e of events) {
    const dayKey = `${e.employeeId}:${eatDayKey(e.createdAt)}`;
    const dayList = byDay.get(dayKey) ?? [];
    dayList.push(e);
    byDay.set(dayKey, dayList);
  }

  for (const dayList of byDay.values()) {
    for (const e of dayList) {
      const shift = resolveShiftForAttendanceEvent(e, shifts, dayList);
      const shiftNum = shift?.shiftNumber ?? "unknown";
      const key = `${e.employeeId}:${eatDayKey(e.createdAt)}:${shiftNum}`;
      const list = byShift.get(key) ?? [];
      list.push(e);
      byShift.set(key, list);
    }
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

/** Last event determines in/out when multiple shifts are allowed per day. */
export function effectiveShiftAttendanceStatus(todayEvents: EmployeeAttendanceRecord[]): "in" | "out" {
  if (todayEvents.length === 0) return "out";
  const last = todayEvents[todayEvents.length - 1];
  return last.eventType === "sign_in" ? "in" : "out";
}

function eventsForShift(
  todayEvents: EmployeeAttendanceRecord[],
  shift: ShiftDefinition,
  shifts: ShiftDefinition[]
): EmployeeAttendanceRecord[] {
  return todayEvents.filter(
    (e) => resolveShiftForAttendanceEvent(e, shifts, todayEvents)?.shiftNumber === shift.shiftNumber
  );
}

/**
 * Validate shift-aware attendance transition.
 * With shifts enabled, allows multiple sign-in/out pairs per day (one pair per shift).
 * Overnight open sessions must be signed out before the next day's sign-in.
 */
export function validateShiftAttendanceTransition(params: {
  todayEvents: EmployeeAttendanceRecord[];
  nextEvent: "sign_in" | "sign_out";
  shiftEnabled: boolean;
  shifts?: ShiftDefinition[];
  currentTime?: Date;
  lastEventBeforeToday?: EmployeeAttendanceRecord | null;
}): { ok: true; shiftNumber?: number } | { ok: false; error: string } {
  const {
    shiftEnabled,
    shifts,
    currentTime = new Date(),
    nextEvent,
    todayEvents,
    lastEventBeforeToday,
  } = params;

  if (!shiftEnabled || !shifts || shifts.length === 0) {
    return validateDailyAttendanceTransition({
      todayEvents,
      nextEvent,
      lastEventBeforeToday,
    });
  }

  const overnightOpen = hasOpenOvernightSession(lastEventBeforeToday);
  const statusToday = effectiveShiftAttendanceStatus(todayEvents);

  if (nextEvent === "sign_out") {
    if (overnightOpen && todayEvents.length === 0) {
      const overnightShift =
        lastEventBeforeToday?.shiftNumber != null
          ? shifts.find((s) => s.shiftNumber === lastEventBeforeToday.shiftNumber)
          : null;
      return {
        ok: true,
        shiftNumber: overnightShift?.shiftNumber ?? lastEventBeforeToday?.shiftNumber ?? undefined,
      };
    }
    if (statusToday === "out") {
      return { ok: false, error: "Not signed in. Please sign in first." };
    }
    const lastSignIn = [...todayEvents].reverse().find((e) => e.eventType === "sign_in");
    const activeShift = lastSignIn
      ? resolveShiftForAttendanceEvent(lastSignIn, shifts, todayEvents)
      : null;
    if (!activeShift) {
      return { ok: false, error: "Could not determine your active shift. Contact your manager." };
    }
    const shiftEvents = eventsForShift(todayEvents, activeShift, shifts);
    const shiftSignOuts = shiftEvents.filter((e) => e.eventType === "sign_out");
    if (shiftSignOuts.length > 0) {
      return {
        ok: false,
        error: `Already signed out for Shift ${activeShift.shiftNumber} today.`,
      };
    }
    return { ok: true, shiftNumber: activeShift.shiftNumber };
  }

  if (overnightOpen && todayEvents.length === 0) {
    return {
      ok: false,
      error:
        "You forgot to sign out yesterday. Sign out first to close that day, then sign in for today.",
    };
  }

  const shift = detectShiftForEvent(currentTime.toISOString(), shifts);
  if (!shift) {
    return {
      ok: false,
      error: "Current time is outside all shift windows. Check reporting times with your manager.",
    };
  }

  const shiftEvents = eventsForShift(todayEvents, shift, shifts);
  const shiftSignIns = shiftEvents.filter((e) => e.eventType === "sign_in");
  const shiftSignOuts = shiftEvents.filter((e) => e.eventType === "sign_out");
  const shiftComplete = shiftSignIns.length > 0 && shiftSignOuts.length > 0;

  if (shiftComplete) {
    return {
      ok: false,
      error: `You already completed Shift ${shift.shiftNumber} today.`,
    };
  }

  if (statusToday === "in") {
    return {
      ok: false,
      error: "Already signed in. Sign out when your shift ends before starting another.",
    };
  }

  if (shiftSignIns.length > 0) {
    return {
      ok: false,
      error: `Already signed in for Shift ${shift.shiftNumber}. Sign out first.`,
    };
  }

  return { ok: true, shiftNumber: shift.shiftNumber };
}
