import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmployeeLeaveApprovedEmail } from "@/lib/employees/send-employee-leave-approved-email";
import type { EmployeeLeaveRecord } from "@/lib/employees/types";

/**
 * Emails the employee when their leave is approved by the business admin.
 */
export async function notifyEmployeeLeaveApproved(
  admin: SupabaseClient,
  params: {
    ownerId: string;
    leave: EmployeeLeaveRecord;
    employeeName: string;
    employeeEmail: string | null;
    businessName?: string;
  }
): Promise<{ sent: boolean; reason?: string }> {
  const email = String(params.employeeEmail ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { sent: false, reason: "Employee has no email on file." };
  }

  const { data: ownerRes } = await admin.auth.admin.getUserById(params.ownerId);
  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const businessName =
    params.businessName?.trim() ||
    String(meta.business_name ?? meta.businessName ?? "").trim() ||
    "Your organisation";

  const sent = await sendEmployeeLeaveApprovedEmail({
    to: email,
    employeeName: params.employeeName,
    businessName,
    leaveType: params.leave.leaveType,
    startDate: params.leave.startDate,
    endDate: params.leave.endDate,
    notes: params.leave.notes,
  });

  return sent ? { sent: true } : { sent: false, reason: "Email service unavailable." };
}
