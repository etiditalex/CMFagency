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
 * In/out for today's rules only — does not carry yesterday's persisted status forward.
 * A new calendar day with no events yet is always treated as signed out.
 */
export function effectiveAttendanceStatusForToday(
  todayEvents: EmployeeAttendanceRecord[]
): "in" | "out" {
  const { hasSignIn, hasSignOut } = summarizeTodayEvents(todayEvents);
  if (hasSignIn && !hasSignOut) return "in";
  return "out";
}

/**
 * Enforces at most one sign-in / sign-out pair per calendar day.
 * After sign-out, the same person cannot sign in again until the next day.
 */
export function validateDailyAttendanceTransition(params: {
  todayEvents: EmployeeAttendanceRecord[];
  nextEvent: EmployeeAttendanceEventType;
  /** @deprecated Use todayEvents only; kept for call-site compatibility. */
  currentStatus?: "in" | "out";
}): { ok: true } | { ok: false; error: string } {
  const { hasSignIn, hasSignOut } = summarizeTodayEvents(params.todayEvents);
  const currentStatus = effectiveAttendanceStatusForToday(params.todayEvents);

  if (params.nextEvent === "sign_in") {
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

  if (params.currentStatus === "out") {
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
