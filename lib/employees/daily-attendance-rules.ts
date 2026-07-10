import { eatDayKey, eatTodayBounds } from "@/lib/time/eat";

import type { EmployeeAttendanceEventType, EmployeeAttendanceRecord } from "@/lib/employees/types";

/** Calendar day key in EAT for attendance rules and reporting. */
export function localDayKey(iso: string | Date): string {
  return eatDayKey(iso);
}

export function todayLocalBounds(): { startIso: string; endIso: string; dayKey: string } {
  return eatTodayBounds();
}

/** One sign-in and one sign-out per employee per day (first sign-in, last sign-out). */
export function dedupeAttendanceByEmployeeDay(
  events: EmployeeAttendanceRecord[]
): EmployeeAttendanceRecord[] {
  const byKey = new Map<string, EmployeeAttendanceRecord[]>();
  for (const e of events) {
    const key = `${e.employeeId}:${localDayKey(e.createdAt)}`;
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

export function summarizeTodayEvents(events: EmployeeAttendanceRecord[]) {
  const signIns = events.filter((e) => e.eventType === "sign_in");
  const signOuts = events.filter((e) => e.eventType === "sign_out");
  return {
    signInCount: signIns.length,
    signOutCount: signOuts.length,
    hasSignIn: signIns.length > 0,
    hasSignOut: signOuts.length > 0,
  };
}

/**
 * In/out from today's events only (ignores an open session from a prior day).
 */
export function effectiveAttendanceStatusForToday(
  todayEvents: EmployeeAttendanceRecord[]
): "in" | "out" {
  const { hasSignIn, hasSignOut } = summarizeTodayEvents(todayEvents);
  if (hasSignIn && !hasSignOut) return "in";
  return "out";
}

/** True when the last event before today is a sign-in with no matching sign-out. */
export function hasOpenOvernightSession(
  lastEventBeforeToday: EmployeeAttendanceRecord | null | undefined
): boolean {
  return lastEventBeforeToday?.eventType === "sign_in";
}

/**
 * Effective in/out for scanning: today's events win; if today has none,
 * an open overnight session still counts as signed in (must sign out first).
 */
export function effectiveAttendanceStatus(params: {
  todayEvents: EmployeeAttendanceRecord[];
  lastEventBeforeToday?: EmployeeAttendanceRecord | null;
}): "in" | "out" {
  if (params.todayEvents.length > 0) {
    return effectiveAttendanceStatusForToday(params.todayEvents);
  }
  if (hasOpenOvernightSession(params.lastEventBeforeToday)) return "in";
  return "out";
}

/**
 * Enforces at most one sign-in / sign-out pair per calendar day.
 * After sign-out, the same person cannot sign in again until the next day.
 * If they forgot to sign out yesterday, they must sign out before signing in today.
 */
export function validateDailyAttendanceTransition(params: {
  todayEvents: EmployeeAttendanceRecord[];
  nextEvent: EmployeeAttendanceEventType;
  /** @deprecated Use todayEvents only; kept for call-site compatibility. */
  currentStatus?: "in" | "out";
  /** Most recent attendance event before today's EAT midnight (if any). */
  lastEventBeforeToday?: EmployeeAttendanceRecord | null;
}): { ok: true } | { ok: false; error: string } {
  const { hasSignIn, hasSignOut } = summarizeTodayEvents(params.todayEvents);
  const overnightOpen = hasOpenOvernightSession(params.lastEventBeforeToday);
  const currentStatus = effectiveAttendanceStatus({
    todayEvents: params.todayEvents,
    lastEventBeforeToday: params.lastEventBeforeToday,
  });

  if (params.nextEvent === "sign_in") {
    if (overnightOpen && params.todayEvents.length === 0) {
      return {
        ok: false,
        error:
          "You forgot to sign out yesterday. Sign out first to close that day, then sign in for today.",
      };
    }
    if (currentStatus === "in") {
      return {
        ok: false,
        error:
          "Already signed in today. Sign out when you leave — you cannot sign in twice on the same day.",
      };
    }
    if (hasSignOut) {
      return {
        ok: false,
        error:
          "You already signed out today. You cannot sign in again until the next working day.",
      };
    }
    if (hasSignIn) {
      return {
        ok: false,
        error:
          "You already completed sign-in for today. Sign out once when you leave; only one sign-in per day is allowed.",
      };
    }
    return { ok: true };
  }

  // Sign out — allow closing an overnight open session with no events yet today.
  if (overnightOpen && params.todayEvents.length === 0) {
    return { ok: true };
  }

  if (params.currentStatus === "out" || currentStatus === "out") {
    return {
      ok: false,
      error: "You are not signed in. Scan to sign in first.",
    };
  }
  if (hasSignOut) {
    return {
      ok: false,
      error: "You already signed out today. Only one sign-out per day is allowed.",
    };
  }
  if (!hasSignIn) {
    return {
      ok: false,
      error: "Sign in before signing out.",
    };
  }
  return { ok: true };
}
