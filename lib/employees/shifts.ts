import type {
  EmployeeAttendanceRecord,
  EmployeeMemberType,
  EmployeeReportingSettings,
  ShiftDefinition,
} from "@/lib/employees/types";
import type { MemberReportingWindow } from "@/lib/employees/reporting-time";
import { reportingWindowForMember } from "@/lib/employees/reporting-time";
import { eatMinutesFromIso } from "@/lib/time/eat";

export const RETAIL_HOSPITALITY_SHIFT_DEFAULTS: Pick<
  EmployeeReportingSettings,
  | "shiftEnabled"
  | "shift1StartTime"
  | "shift1EndTime"
  | "shift2StartTime"
  | "shift2EndTime"
  | "shift1SignInStartTime"
  | "shift1SignInTime"
  | "shift1SignOutTime"
  | "shift2SignInStartTime"
  | "shift2SignInTime"
  | "shift2SignOutTime"
  | "staffReportingSignInStart"
  | "staffReportingSignIn"
  | "staffReportingSignOut"
> = {
  shiftEnabled: true,
  shift1StartTime: "06:00",
  shift1EndTime: "15:00",
  shift2StartTime: "15:00",
  shift2EndTime: "23:00",
  shift1SignInStartTime: "06:00",
  shift1SignInTime: "08:00",
  shift1SignOutTime: "15:00",
  shift2SignInStartTime: "15:00",
  shift2SignInTime: "16:00",
  shift2SignOutTime: "23:00",
  staffReportingSignInStart: "06:00",
  staffReportingSignIn: "08:00",
  staffReportingSignOut: "15:00",
};

export function shiftsFromSettings(settings: EmployeeReportingSettings): ShiftDefinition[] {
  if (!settings.shiftEnabled) return [];
  return [
    {
      shiftNumber: 1,
      startTime: settings.shift1StartTime ?? "06:00",
      endTime: settings.shift1EndTime ?? "15:00",
      signInStartTime: settings.shift1SignInStartTime ?? "06:00",
      signInTime: settings.shift1SignInTime ?? "08:00",
      signOutTime: settings.shift1SignOutTime ?? "15:00",
    },
    {
      shiftNumber: 2,
      startTime: settings.shift2StartTime ?? "15:00",
      endTime: settings.shift2EndTime ?? "23:00",
      signInStartTime: settings.shift2SignInStartTime ?? "15:00",
      signInTime: settings.shift2SignInTime ?? "16:00",
      signOutTime: settings.shift2SignOutTime ?? "23:00",
    },
  ];
}

function minutesFromTimeHHMM(time24: string): number {
  const m = time24.match(/^(\d{2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Which shift an event falls in (EAT). Later shift wins at exact boundaries (e.g. 15:00 → shift 2). */
export function detectShiftForEvent(
  iso: string,
  shifts: ShiftDefinition[]
): ShiftDefinition | null {
  const eventMinutes = eatMinutesFromIso(iso);
  if (eventMinutes === null || shifts.length === 0) return null;

  const sorted = [...shifts].sort((a, b) => b.shiftNumber - a.shiftNumber);
  for (const shift of sorted) {
    const start = minutesFromTimeHHMM(shift.signInStartTime);
    const end = minutesFromTimeHHMM(shift.signOutTime);
    if (eventMinutes >= start && eventMinutes <= end) return shift;
  }
  return null;
}

export function shiftByNumber(
  shifts: ShiftDefinition[],
  shiftNumber: number
): ShiftDefinition | null {
  return shifts.find((s) => s.shiftNumber === shiftNumber) ?? null;
}

/** Prefer stored shift_number; for sign-out after shift end, pair with the matching sign-in. */
export function resolveShiftForAttendanceEvent(
  event: Pick<EmployeeAttendanceRecord, "createdAt" | "eventType" | "shiftNumber" | "employeeId">,
  shifts: ShiftDefinition[],
  dayEvents?: EmployeeAttendanceRecord[]
): ShiftDefinition | null {
  if (shifts.length === 0) return null;

  if (event.shiftNumber === 1 || event.shiftNumber === 2) {
    return shiftByNumber(shifts, event.shiftNumber);
  }

  if (event.eventType === "sign_out" && dayEvents?.length) {
    const pairedSignIn = [...dayEvents]
      .filter(
        (e) =>
          e.employeeId === event.employeeId &&
          e.eventType === "sign_in" &&
          e.createdAt <= event.createdAt
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .pop();
    if (pairedSignIn) {
      if (pairedSignIn.shiftNumber === 1 || pairedSignIn.shiftNumber === 2) {
        return shiftByNumber(shifts, pairedSignIn.shiftNumber);
      }
      return detectShiftForEvent(pairedSignIn.createdAt, shifts);
    }
  }

  return detectShiftForEvent(event.createdAt, shifts);
}

export function reportingWindowForEvent(
  event: Pick<EmployeeAttendanceRecord, "createdAt" | "eventType" | "shiftNumber" | "employeeId">,
  settings: EmployeeReportingSettings,
  memberType: EmployeeMemberType,
  dayEvents?: EmployeeAttendanceRecord[]
): MemberReportingWindow {
  if (settings.shiftEnabled) {
    const shift = resolveShiftForAttendanceEvent(
      event,
      shiftsFromSettings(settings),
      dayEvents
    );
    if (shift) {
      return {
        signInStart: shift.signInStartTime,
        signInLatest: shift.signInTime,
        signOut: shift.signOutTime,
      };
    }
  }
  return reportingWindowForMember(settings, memberType);
}

/** Hours worked from actual clock-in to clock-out (fractional hours, 2 dp). */
export function hoursWorkedBetween(signInIso: string, signOutIso: string): number {
  const start = new Date(signInIso).getTime();
  const end = new Date(signOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

export function formatHoursWorked(hours: number): string {
  if (hours <= 0) return "—";
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  if (whole === 0) return `${mins}m`;
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}
