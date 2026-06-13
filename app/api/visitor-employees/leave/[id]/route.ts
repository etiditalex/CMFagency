import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingLeaveTable,
  mapLeaveRow,
  type EmployeeLeaveRow,
} from "@/lib/employees/db-mapper";
import { isValidLeaveDate, parseLeaveStatus, parseLeaveType } from "@/lib/employees/leave-rules";
import { notifyEmployeeLeaveApproved } from "@/lib/employees/notify-employee-leave-approved";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

const LEAVE_SELECT =
  "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at";

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

type RouteContext = { params: Promise<{ id: string }> };

async function fetchLeaveRow(
  admin: SupabaseClient,
  leaveId: string,
  ownerId: string,
  isAdmin: boolean
) {
  let q = admin.from("visitor_employee_leave").select(LEAVE_SELECT).eq("id", leaveId);
  if (!isAdmin) q = q.eq("owner_id", ownerId);
  return q.maybeSingle();
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await context.params;
    const leaveId = String(id ?? "").trim();
    if (!leaveId) return NextResponse.json({ error: "Missing leave id." }, { status: 400 });

    const { data: existing, error: fetchErr } = await fetchLeaveRow(admin, leaveId, userId, isAdmin);
    if (fetchErr) {
      if (isMissingLeaveTable(fetchErr)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) return NextResponse.json({ error: "Leave record not found." }, { status: 404 });

    const current = mapLeaveRow(existing as EmployeeLeaveRow);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const nextStatus = parseLeaveStatus(body.status ?? body.action);
    const isApproval = nextStatus === "approved";
    const isRejection = nextStatus === "rejected";

    if (isApproval || isRejection) {
      if (current.status === "approved" && isApproval) {
        return NextResponse.json({ error: "Leave is already approved." }, { status: 400 });
      }
      updates.status = nextStatus;
      if (isApproval) {
        updates.approved_at = new Date().toISOString();
        updates.rejected_at = null;
      } else {
        updates.rejected_at = new Date().toISOString();
        updates.approved_at = null;
      }
    } else if (current.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending leave can be edited. Approve or reject it first." },
        { status: 400 }
      );
    }

    if (body.startDate !== undefined || body.start_date !== undefined) {
      const startDate = safeText(body.startDate ?? body.start_date, 10);
      if (!isValidLeaveDate(startDate)) {
        return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
      }
      updates.start_date = startDate;
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      const endDate = safeText(body.endDate ?? body.end_date, 10);
      if (!isValidLeaveDate(endDate)) {
        return NextResponse.json({ error: "Invalid end date." }, { status: 400 });
      }
      updates.end_date = endDate;
    }
    if (body.leaveType !== undefined || body.leave_type !== undefined) {
      updates.leave_type = parseLeaveType(body.leaveType ?? body.leave_type);
    }
    if (body.notes !== undefined) {
      updates.notes = safeText(body.notes, 500);
    }

    let q = admin
      .from("visitor_employee_leave")
      .update(updates)
      .eq("id", leaveId)
      .select(LEAVE_SELECT);

    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q.maybeSingle();
    if (error) {
      if (isMissingLeaveTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Leave record not found." }, { status: 404 });

    const row = data as EmployeeLeaveRow;
    if (row.end_date < row.start_date) {
      return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 });
    }

    const leave = mapLeaveRow(row);
    let notification: { sent: boolean; reason?: string } | undefined;

    if (isApproval && current.status !== "approved") {
      const { data: empRow } = await admin
        .from("visitor_employees")
        .select("full_name,email")
        .eq("id", leave.employeeId)
        .maybeSingle();

      notification = await notifyEmployeeLeaveApproved(admin, {
        ownerId: userId,
        leave,
        employeeName: String(empRow?.full_name ?? "Team member"),
        employeeEmail: empRow?.email ?? null,
      });

      if (notification.sent) {
        await admin
          .from("visitor_employee_leave")
          .update({ notification_sent_at: new Date().toISOString() })
          .eq("id", leaveId);
        leave.notificationSentAt = new Date().toISOString();
      }
    }

    return NextResponse.json({ leave, notification });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await context.params;
    const leaveId = String(id ?? "").trim();
    if (!leaveId) return NextResponse.json({ error: "Missing leave id." }, { status: 400 });

    let q = admin.from("visitor_employee_leave").delete().eq("id", leaveId);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { error } = await q;
    if (error) {
      if (isMissingLeaveTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
