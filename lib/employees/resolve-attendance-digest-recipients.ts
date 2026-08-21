import type { SupabaseClient } from "@supabase/supabase-js";

import { attendanceReportsPlatformAdminEmails } from "@/lib/fusion-xpress-admin-emails";

function parseNotificationEmails(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((e) => String(e).trim().toLowerCase())
      .filter((e) => e.includes("@"));
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/[,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
  }
  return [];
}

/**
 * Recipients for one organisation's attendance PDF digest:
 * 1. Business account email (subscription owner)
 * 2. People listed to receive notifications for that business
 * 3. Fusion Xpress platform admin (auriljoy916@gmail.com) and extra FUSION_XPRESS_ADMIN_EMAILS
 */
export async function resolveAttendanceDigestRecipients(
  admin: SupabaseClient,
  ownerId: string
): Promise<string[]> {
  const recipients = new Set<string>();

  const { data: ownerRes } = await admin.auth.admin.getUserById(ownerId);
  const ownerEmail = String(ownerRes?.user?.email ?? "")
    .trim()
    .toLowerCase();
  if (ownerEmail.includes("@")) recipients.add(ownerEmail);

  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["director_emails", "director_notification_emails", "notification_emails"]) {
    for (const email of parseNotificationEmails(meta[key])) {
      recipients.add(email);
    }
  }

  const { data: adminRows } = await admin
    .from("visitor_employee_notification_admins")
    .select("email")
    .eq("owner_id", ownerId);

  for (const row of adminRows ?? []) {
    const email = String((row as { email?: string }).email ?? "")
      .trim()
      .toLowerCase();
    if (email.includes("@")) recipients.add(email);
  }

  for (const email of attendanceReportsPlatformAdminEmails()) {
    recipients.add(email);
  }

  return [...recipients];
}
