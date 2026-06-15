import { countDaysInLeaveRange, isValidLeaveDate, parseLeaveType } from "@/lib/employees/leave-rules";
import type { EmployeeLeaveType } from "@/lib/employees/types";
import { eatDayKey, eatDaySpanInclusive, eatTodayDayKey } from "@/lib/time/eat";

export const LEAVE_ADVANCE_NOTICE_DAYS = 2;

export const PUBLIC_LEAVE_FORM_TYPES = [
  { value: "annual" as const, label: "Earned leave" },
  { value: "other" as const, label: "Casual leave" },
  { value: "sick" as const, label: "Sick leave" },
] as const;

export type PublicLeaveFormType = (typeof PUBLIC_LEAVE_FORM_TYPES)[number]["value"];

export function employeeLeaveApplicationPath(token: string): string {
  const qs = new URLSearchParams({ token: token.trim() });
  return `/fusion-xpress/smart-visitor-management/employee-leave?${qs.toString()}`;
}

export function employeeLeaveApplicationUrl(token: string, siteOrigin?: string): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = employeeLeaveApplicationPath(token);
  return base ? `${base}${path}` : path;
}

export function eatAddDays(ymd: string, days: number): string {
  const anchor = new Date(`${ymd}T12:00:00+03:00`);
  anchor.setTime(anchor.getTime() + days * 86_400_000);
  return eatDayKey(anchor);
}

/** Earliest allowed first leave day for non-sick requests submitted today. */
export function earliestAdvanceLeaveStartYmd(noticeDays = LEAVE_ADVANCE_NOTICE_DAYS): string {
  return eatAddDays(eatTodayDayKey(), noticeDays);
}

export function leaveTypeRequiresAdvanceNotice(leaveType: EmployeeLeaveType | string): boolean {
  return String(leaveType).toLowerCase() !== "sick";
}

export function validateAdvanceLeaveStart(
  startDate: string,
  leaveType: EmployeeLeaveType | string,
  noticeDays = LEAVE_ADVANCE_NOTICE_DAYS
): { ok: true } | { ok: false; error: string } {
  if (!leaveTypeRequiresAdvanceNotice(leaveType)) return { ok: true };
  if (!isValidLeaveDate(startDate)) {
    return { ok: false, error: "Choose a valid start date." };
  }
  const minStart = earliestAdvanceLeaveStartYmd(noticeDays);
  if (startDate < minStart) {
    return {
      ok: false,
      error: `Submit earned or casual leave at least ${noticeDays} days before your first absent day. Earliest start date: ${minStart}.`,
    };
  }
  return { ok: true };
}

export function buildLeaveApplicationNotes(params: {
  reason: string;
  attachmentName?: string | null;
}): string {
  const parts: string[] = [];
  const reason = params.reason.trim();
  if (reason) parts.push(`Reason: ${reason}`);
  if (params.attachmentName?.trim()) {
    parts.push(`Supporting document: ${params.attachmentName.trim()}`);
  }
  parts.push("Submitted via employee leave application form.");
  return parts.join("\n\n");
}

export function parsePublicLeaveFormType(raw: unknown): EmployeeLeaveType {
  const v = String(raw ?? "").toLowerCase().trim();
  if (v === "earned" || v === "annual") return "annual";
  if (v === "casual") return "other";
  return parseLeaveType(v);
}

export function publicLeaveDayCount(startDate: string, endDate: string): number {
  return countDaysInLeaveRange(startDate, endDate) || eatDaySpanInclusive(startDate, endDate);
}

const MAX_ATTACHMENT_BYTES = 1_500_000;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateLeaveAttachment(file: File | null, leaveType: EmployeeLeaveType | string) {
  if (String(leaveType).toLowerCase() !== "sick") {
    return { ok: true as const, file: null as File | null };
  }
  if (!file) {
    return {
      ok: false as const,
      error: "Attach a supportive document for sick leave (image or PDF, max 1.5 MB).",
    };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { ok: false as const, error: "Use a JPEG, PNG, WebP, or PDF file for sick leave." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false as const, error: "Attachment is too large. Maximum size is 1.5 MB." };
  }
  return { ok: true as const, file };
}
