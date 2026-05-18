import type { EmployeeMemberType, EmployeeReportingSettings } from "@/lib/employees/types";

export function reportingWindowForMember(
  settings: EmployeeReportingSettings,
  memberType: EmployeeMemberType
): { signIn: string; signOut: string } {
  if (memberType === "crm") {
    return {
      signIn: settings.crmReportingSignIn,
      signOut: settings.crmReportingSignOut,
    };
  }
  return {
    signIn: settings.staffReportingSignIn,
    signOut: settings.staffReportingSignOut,
  };
}

/** Format HH:mm for display (e.g. 9:00 AM). */
export function formatReportingTime(time24: string): string {
  const m = time24.match(/^(\d{2}):(\d{2})/);
  if (!m) return time24;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${min} ${ampm}`;
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

export function signInReportingStatus(
  signedInAt: string | null | undefined,
  expectedSignIn: string
): "on_time" | "late" | "early" | "unknown" {
  const actual = minutesFromIso(signedInAt);
  if (actual === null) return "unknown";
  const expected = minutesFromTime(expectedSignIn);
  if (actual === expected) return "on_time";
  if (actual > expected) return "late";
  return "early";
}

export function signInStatusLabel(status: ReturnType<typeof signInReportingStatus>): string {
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

export function signInStatusClass(status: ReturnType<typeof signInReportingStatus>): string {
  switch (status) {
    case "on_time":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "late":
      return "text-amber-800 bg-amber-50 border-amber-200";
    case "early":
      return "text-sky-700 bg-sky-50 border-sky-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
}
