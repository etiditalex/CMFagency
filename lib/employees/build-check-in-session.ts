import type { CheckInSession } from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import {
  formatCheckInClock,
  formatCheckInDateLabel,
} from "@/lib/visitors/format-check-in-display";

export function buildEmployeeCheckInSession(params: {
  venueName: string;
  fullName: string;
  occurredAt: string;
  employeeId?: string;
  department?: string | null;
  employeeCode?: string | null;
  emailSent?: boolean;
  employeeEmailSent?: boolean;
}): CheckInSession {
  return {
    visitorId: params.employeeId ?? "",
    venueName: params.venueName.trim() || "Workplace",
    visitorName: params.fullName.trim() || "Employee",
    checkedInAt: params.occurredAt,
    timeLabel: formatCheckInClock(params.occurredAt),
    dateLabel: formatCheckInDateLabel(params.occurredAt),
    department: params.department?.trim() || undefined,
    employeeCode: params.employeeCode?.trim() || undefined,
    emailSent: params.employeeEmailSent ?? params.emailSent,
    organisationNotified: params.emailSent,
  };
}
