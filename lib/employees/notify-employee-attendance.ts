import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmployeeAttendanceNotificationEmail } from "@/lib/employees/send-employee-attendance-email";
import type { EmployeeAttendanceEventType } from "@/lib/employees/types";

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
 * Notifies the organisation owner and director notification emails when
 * a staff member signs in or out.
 */
export async function notifyEmployeeAttendance(
  admin: SupabaseClient,
  params: {
    ownerId: string;
    employeeName: string;
    department: string;
    eventType: EmployeeAttendanceEventType;
    occurredAt: string;
    deviceLabel: string;
    businessName?: string;
  }
): Promise<void> {
  const recipients = new Set<string>();

  const { data: ownerRes } = await admin.auth.admin.getUserById(params.ownerId);
  const ownerEmail = String(ownerRes?.user?.email ?? "")
    .trim()
    .toLowerCase();
  if (ownerEmail.includes("@")) recipients.add(ownerEmail);

  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const businessName =
    params.businessName?.trim() ||
    String(meta.business_name ?? meta.businessName ?? "").trim() ||
    "Your organisation";

  for (const key of ["director_emails", "director_notification_emails", "notification_emails"]) {
    for (const email of parseNotificationEmails(meta[key])) {
      recipients.add(email);
    }
  }

  if (recipients.size === 0) return;

  await sendEmployeeAttendanceNotificationEmail({
    to: [...recipients],
    employeeName: params.employeeName,
    department: params.department,
    businessName,
    eventType: params.eventType,
    occurredAt: params.occurredAt,
    deviceLabel: params.deviceLabel,
  });
}
