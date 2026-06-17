import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import { sendEmployeeAttendanceNotificationEmail } from "@/lib/employees/send-employee-attendance-email";
import { sendEmployeeSignInWelcomeEmail } from "@/lib/employees/send-employee-sign-in-welcome-email";
import type { EmployeeAttendanceEventType } from "@/lib/employees/types";
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

type NotificationAdminRow = {
  email: string;
  notify_sign_in: boolean;
  notify_sign_out: boolean;
};

export type EmployeeAttendanceNotifyResult = {
  businessName: string;
  emailSent: boolean;
  employeeEmailSent: boolean;
};

/**
 * Notifies account owner, configured notification admins, Fusion Xpress platform admins,
 * and the employee (when an email is on file).
 */
export async function notifyEmployeeAttendance(
  admin: SupabaseClient,
  params: {
    ownerId: string;
    employeeName: string;
    employeeEmail?: string | null;
    employeeCode?: string | null;
    department: string;
    eventType: EmployeeAttendanceEventType;
    occurredAt: string;
    deviceLabel: string;
    businessName?: string;
  }
): Promise<EmployeeAttendanceNotifyResult> {
  const ownerRecipients = new Set<string>();
  const adminRecipients = new Set<string>();
  const platformRecipients = new Set<string>(parseFusionXpressAdminEmails());

  const { data: ownerRes } = await admin.auth.admin.getUserById(params.ownerId);
  const ownerEmail = String(ownerRes?.user?.email ?? "")
    .trim()
    .toLowerCase();
  if (ownerEmail.includes("@")) ownerRecipients.add(ownerEmail);

  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const businessName =
    params.businessName?.trim() ||
    (await resolveOwnerBusinessName(admin, params.ownerId));

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
    return { businessName, emailSent: false, employeeEmailSent: false };
  }

  let ownerNotified = false;
  let adminNotified = false;
  let platformNotified = false;

  if (ownerRecipients.size > 0) {
    await sendEmployeeAttendanceNotificationEmail({
      to: [...ownerRecipients],
      ...payload,
    });
    ownerNotified = true;
  }

  if (adminRecipients.size > 0) {
    await sendEmployeeAttendanceNotificationEmail({
      to: [...adminRecipients],
      ...payload,
    });
    adminNotified = true;
  }

  if (platformRecipients.size > 0) {
    await sendEmployeeAttendanceNotificationEmail({
      to: [...platformRecipients],
      ...payload,
    });
    platformNotified = true;
  }

  if (!ownerNotified && !adminNotified && !platformNotified) {
    console.warn(
      "[notifyEmployeeAttendance] no recipients for owner",
      params.ownerId,
      params.eventType
    );
  }

  const employeeEmail = String(params.employeeEmail ?? "")
    .trim()
    .toLowerCase();
  let employeeEmailSent = false;
  if (employeeEmail.includes("@")) {
    employeeEmailSent = await sendEmployeeSignInWelcomeEmail({
      to: employeeEmail,
      employeeName: params.employeeName,
      businessName,
      occurredAt: params.occurredAt,
      employeeCode: params.employeeCode,
      eventType: params.eventType,
    });
  }

  return {
    businessName,
    emailSent: ownerNotified || adminNotified || platformNotified || employeeEmailSent,
    employeeEmailSent,
  };
}
