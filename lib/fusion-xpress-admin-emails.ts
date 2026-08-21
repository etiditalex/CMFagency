/** Fusion Xpress platform admin who receives attendance reports for every organisation. */
export const ATTENDANCE_REPORTS_PLATFORM_ADMIN_EMAIL = "auriljoy916@gmail.com";

export function parseFusionXpressAdminEmails(): string[] {
  return String(process.env.FUSION_XPRESS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

/** Always includes the main admin, plus any extra addresses in FUSION_XPRESS_ADMIN_EMAILS. */
export function attendanceReportsPlatformAdminEmails(): string[] {
  const emails = new Set<string>([ATTENDANCE_REPORTS_PLATFORM_ADMIN_EMAIL.toLowerCase()]);
  for (const email of parseFusionXpressAdminEmails()) {
    emails.add(email);
  }
  return [...emails];
}

