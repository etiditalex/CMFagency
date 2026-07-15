import type { SupabaseClient } from "@supabase/supabase-js";

import {
  attendanceRegisterDownloadUrl,
  createAttendanceRegisterDownloadToken,
} from "@/lib/employees/attendance-register-download-token";
import { resolveOwnerBusinessName } from "@/lib/employees/owner-business-name";
import { sendAttendanceRegisterWhatsApp } from "@/lib/employees/send-attendance-whatsapp";
import { sendEmployeeSignInWelcomeEmail } from "@/lib/employees/send-employee-sign-in-welcome-email";
import type { EmployeeAttendanceEventType } from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";
import { eatDayKey } from "@/lib/time/eat";

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
 * On each scan: employee acknowledgement email (if on file) + optional WhatsApp.
 * Business owners/admins get scheduled daily / weekly / monthly PDF digests instead
 * of an email on every sign-in or sign-out.
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
  const whatsappRecipients = new Set<string>();

  const { data: ownerRes } = await admin.auth.admin.getUserById(params.ownerId);
  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const businessName =
    params.businessName?.trim() ||
    (await resolveOwnerBusinessName(admin, params.ownerId));

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
    if (row.notify_whatsapp !== false) {
      const wantsIn = params.eventType === "sign_in" && row.notify_sign_in !== false;
      const wantsOut = params.eventType === "sign_out" && row.notify_sign_out !== false;
      const phone = parseWhatsAppPhone(row.whatsapp_phone);
      if (phone && (wantsIn || wantsOut)) whatsappRecipients.add(phone);
    }
  }

  const dayKey = eatDayKey(params.occurredAt);
  let registerDownloadUrl: string | null = null;
  try {
    const token = createAttendanceRegisterDownloadToken(params.ownerId, dayKey);
    if (token) registerDownloadUrl = attendanceRegisterDownloadUrl(token);
  } catch (e) {
    console.warn(
      "[notifyEmployeeAttendance] register token failed:",
      e instanceof Error ? e.message : e
    );
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[notifyEmployeeAttendance] RESEND_API_KEY not set; skipping emails");
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
    emailSent: employeeEmailSent,
    employeeEmailSent,
    whatsappSent,
    registerAttached: false,
  };
}
