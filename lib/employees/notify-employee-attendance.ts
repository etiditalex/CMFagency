import type { SupabaseClient } from "@supabase/supabase-js";

import {
  attendanceRegisterDownloadUrl,
  createAttendanceRegisterDownloadToken,
} from "@/lib/employees/attendance-register-download-token";
import { fetchOwnerAttendanceRegister } from "@/lib/employees/fetch-owner-attendance-register";
import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import { sendAttendanceRegisterWhatsApp } from "@/lib/employees/send-attendance-whatsapp";
import { sendEmployeeAttendanceNotificationEmail } from "@/lib/employees/send-employee-attendance-email";
import { sendEmployeeSignInWelcomeEmail } from "@/lib/employees/send-employee-sign-in-welcome-email";
import type { EmployeeAttendanceEventType } from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";
import { parseFusionXpressAdminEmails } from "@/lib/fusion-xpress-admin-emails";
import { eatDayKey } from "@/lib/time/eat";

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

function parseWhatsAppPhone(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

type NotificationAdminRow = {
  email: string;
  notify_sign_in: boolean;
  notify_sign_out: boolean;
  whatsapp_phone?: string | null;
  notify_whatsapp?: boolean | null;
};

export type EmployeeAttendanceNotifyResult = {
  businessName: string;
  emailSent: boolean;
  employeeEmailSent: boolean;
  whatsappSent: boolean;
  registerAttached: boolean;
};

/**
 * Notifies account owner, configured notification admins, Fusion Xpress platform admins,
 * and the employee (when an email is on file). Includes today's attendance register Excel.
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
  const whatsappRecipients = new Set<string>();

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

  const ownerWhatsApp = parseWhatsAppPhone(
    meta.attendance_whatsapp ?? meta.attendanceWhatsapp ?? meta.business_whatsapp
  );
  if (ownerWhatsApp) whatsappRecipients.add(ownerWhatsApp);

  let adminRows: NotificationAdminRow[] = [];
  const adminQuery = await admin
    .from("visitor_employee_notification_admins")
    .select("email,notify_sign_in,notify_sign_out,whatsapp_phone,notify_whatsapp")
    .eq("owner_id", params.ownerId);

  if (adminQuery.error && /whatsapp|column/i.test(adminQuery.error.message)) {
    const fallback = await admin
      .from("visitor_employee_notification_admins")
      .select("email,notify_sign_in,notify_sign_out")
      .eq("owner_id", params.ownerId);
    adminRows = (fallback.data ?? []) as NotificationAdminRow[];
  } else {
    adminRows = (adminQuery.data ?? []) as NotificationAdminRow[];
  }

  for (const row of adminRows) {
    const email = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (email.includes("@")) {
      const wantsIn = params.eventType === "sign_in" && row.notify_sign_in !== false;
      const wantsOut = params.eventType === "sign_out" && row.notify_sign_out !== false;
      if (wantsIn || wantsOut) adminRecipients.add(email);
    }

    if (row.notify_whatsapp !== false) {
      const wantsIn = params.eventType === "sign_in" && row.notify_sign_in !== false;
      const wantsOut = params.eventType === "sign_out" && row.notify_sign_out !== false;
      const phone = parseWhatsAppPhone(row.whatsapp_phone);
      if (phone && (wantsIn || wantsOut)) whatsappRecipients.add(phone);
    }
  }

  const dayKey = eatDayKey(params.occurredAt);
  let registerAttachment: { filename: string; contentBase64: string } | null = null;
  let registerDownloadUrl: string | null = null;

  try {
    const register = await fetchOwnerAttendanceRegister(admin, params.ownerId, dayKey);
    if (register) {
      registerAttachment = {
        filename: register.filename,
        contentBase64: register.buffer.toString("base64"),
      };
      const token = createAttendanceRegisterDownloadToken(params.ownerId, dayKey);
      if (token) registerDownloadUrl = attendanceRegisterDownloadUrl(token);
    }
  } catch (e) {
    console.warn(
      "[notifyEmployeeAttendance] register build failed:",
      e instanceof Error ? e.message : e
    );
  }

  const payload = {
    employeeName: params.employeeName,
    department: params.department,
    businessName,
    eventType: params.eventType,
    occurredAt: params.occurredAt,
    deviceLabel: params.deviceLabel,
    registerAttachment,
    registerDownloadUrl,
    registerDayKey: dayKey,
  };

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[notifyEmployeeAttendance] RESEND_API_KEY not set; skipping emails");
  }

  let ownerNotified = false;
  let adminNotified = false;
  let platformNotified = false;

  if (process.env.RESEND_API_KEY?.trim()) {
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
  }

  if (!ownerNotified && !adminNotified && !platformNotified) {
    console.warn(
      "[notifyEmployeeAttendance] no email recipients for owner",
      params.ownerId,
      params.eventType
    );
  }

  const employeeEmail = String(params.employeeEmail ?? "")
    .trim()
    .toLowerCase();
  let employeeEmailSent = false;
  if (employeeEmail.includes("@") && process.env.RESEND_API_KEY?.trim()) {
    employeeEmailSent = await sendEmployeeSignInWelcomeEmail({
      to: employeeEmail,
      employeeName: params.employeeName,
      businessName,
      occurredAt: params.occurredAt,
      employeeCode: params.employeeCode,
      eventType: params.eventType,
    });
  }

  let whatsappSent = false;
  if (whatsappRecipients.size > 0) {
    const occurredAtLabel = formatEmployeeEmailDateTime(params.occurredAt);
    for (const phone of whatsappRecipients) {
      const ok = await sendAttendanceRegisterWhatsApp({
        to: phone,
        businessName,
        employeeName: params.employeeName,
        eventType: params.eventType,
        occurredAtLabel,
        dayKey,
        downloadUrl: registerDownloadUrl,
      });
      if (ok) whatsappSent = true;
    }
  }

  return {
    businessName,
    emailSent: ownerNotified || adminNotified || platformNotified || employeeEmailSent,
    employeeEmailSent,
    whatsappSent,
    registerAttached: Boolean(registerAttachment),
  };
}
