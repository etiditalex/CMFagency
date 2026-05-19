import type { EmployeeMemberType, EmployeeReportingSettings } from "@/lib/employees/types";

export type MemberReportingWindow = {
  signInStart: string;
  signInLatest: string;
  signOut: string;
};

export function reportingWindowForMember(
  settings: EmployeeReportingSettings,
  memberType: EmployeeMemberType
): MemberReportingWindow {
  if (memberType === "crm") {
    return {
      signInStart: settings.crmReportingSignInStart,
      signInLatest: settings.crmReportingSignIn,
      signOut: settings.crmReportingSignOut,
    };
  }
  return {
    signInStart: settings.staffReportingSignInStart,
    signInLatest: settings.staffReportingSignIn,
    signOut: settings.staffReportingSignOut,
  };
}

/** Format HH:mm for display (e.g. 7:00 AM). */
export function formatReportingTime(time24: string): string {
  const m = time24.match(/^(\d{2}):(\d{2})/);
  if (!m) return time24;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${min} ${ampm}`;
}

export function formatSignInWindowLabel(window: MemberReportingWindow): string {
  return `${formatReportingTime(window.signInStart)} – ${formatReportingTime(window.signInLatest)}`;
}

/** Minutes since midnight from ISO timestamp in local interpretation. */
function minutesFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function minutesFromTime(time24: string): number {
  const m = time24.match(/^(\d{2}):(\d{2})/);
  if (!m) return 9 * 60;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export type SignInReportingStatus = "on_time" | "late" | "early" | "unknown";

/** On time when sign-in is within [signInStart, signInLatest]; after latest = late. */
export function signInReportingStatus(
  signedInAt: string | null | undefined,
  window: MemberReportingWindow
): SignInReportingStatus {
  const actual = minutesFromIso(signedInAt);
  if (actual === null) return "unknown";
  const start = minutesFromTime(window.signInStart);
  const latest = minutesFromTime(window.signInLatest);
  if (actual < start) return "early";
  if (actual > latest) return "late";
  return "on_time";
}

export function signInStatusLabel(status: SignInReportingStatus): string {
  switch (status) {
    case "on_time":
      return "On time";
    case "late":
      return "Late";
    case "early":
      return "Early";
    default:
      return "—";
  }
}

export function signInStatusClass(status: SignInReportingStatus): string {
  switch (status) {
    case "on_time":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "late":
      return "text-red-800 bg-red-50 border-red-300";
    case "early":
      return "text-sky-700 bg-sky-50 border-sky-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
}

export type SignOutReportingStatus = "on_time" | "early" | "unknown";

/** On time when sign-out is at or after expected sign-out time (e.g. 5:00 PM). */
export function signOutReportingStatus(
  signedOutAt: string | null | undefined,
  expectedSignOut: string
): SignOutReportingStatus {
  const actual = minutesFromIso(signedOutAt);
  if (actual === null) return "unknown";
  const expected = minutesFromTime(expectedSignOut);
  if (actual < expected) return "early";
  return "on_time";
}

export function signOutStatusLabel(status: SignOutReportingStatus): string {
  switch (status) {
    case "on_time":
      return "Left on time";
    case "early":
      return "Left early";
    default:
      return "—";
  }
}

export function signOutStatusClass(status: SignOutReportingStatus): string {
  switch (status) {
    case "on_time":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "early":
      return "text-amber-800 bg-amber-50 border-amber-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
}
