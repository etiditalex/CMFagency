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

type NotificationAdminRow = {
  email: string;
  notify_sign_in: boolean;
  notify_sign_out: boolean;
};

/**
 * Notifies account owner (sign-in and sign-out) plus configured notification admins.
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
  const ownerRecipients = new Set<string>();
  const adminRecipients = new Set<string>();

  const { data: ownerRes } = await admin.auth.admin.getUserById(params.ownerId);
  const ownerEmail = String(ownerRes?.user?.email ?? "")
    .trim()
    .toLowerCase();
  if (ownerEmail.includes("@")) ownerRecipients.add(ownerEmail);

  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const businessName =
    params.businessName?.trim() ||
    String(meta.business_name ?? meta.businessName ?? "").trim() ||
    "Your organisation";

  for (const key of ["director_emails", "director_notification_emails", "notification_emails"]) {
    for (const email of parseNotificationEmails(meta[key])) {
      ownerRecipients.add(email);
    }
  }

  const { data: adminRows } = await admin
    .from("visitor_employee_notification_admins")
    .select("email,notify_sign_in,notify_sign_out")
    .eq("owner_id", params.ownerId);

  for (const row of (adminRows ?? []) as NotificationAdminRow[]) {
    const email = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) continue;
    const wantsIn = params.eventType === "sign_in" && row.notify_sign_in !== false;
    const wantsOut = params.eventType === "sign_out" && row.notify_sign_out !== false;
    if (wantsIn || wantsOut) adminRecipients.add(email);
  }

  const payload = {
    employeeName: params.employeeName,
    department: params.department,
    businessName,
    eventType: params.eventType,
    occurredAt: params.occurredAt,
    deviceLabel: params.deviceLabel,
  };

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[notifyEmployeeAttendance] RESEND_API_KEY not set; skipping emails");
    return;
  }

  if (ownerRecipients.size === 0 && adminRecipients.size === 0) {
    console.warn(
      "[notifyEmployeeAttendance] no recipients for owner",
      params.ownerId,
      params.eventType
    );
    return;
  }

  if (ownerRecipients.size > 0) {
    await sendEmployeeAttendanceNotificationEmail({
      to: [...ownerRecipients],
      ...payload,
    });
  }

  if (adminRecipients.size > 0) {
    await sendEmployeeAttendanceNotificationEmail({
      to: [...adminRecipients],
      ...payload,
    });
  }
}
