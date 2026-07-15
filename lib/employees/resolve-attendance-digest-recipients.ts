import type { SupabaseClient } from "@supabase/supabase-js";

import { parseFusionXpressAdminEmails } from "@/lib/fusion-xpress-admin-emails";

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

/** Owner + director/notification emails + notification admins + platform admins. */
export async function resolveAttendanceDigestRecipients(
  admin: SupabaseClient,
  ownerId: string
): Promise<string[]> {
  const recipients = new Set<string>(parseFusionXpressAdminEmails());

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

  return [...recipients];
}
