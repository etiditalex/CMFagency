import { NextRequest } from "next/server";

import {
  isMissingLeaveTable,
  mapLeaveRow,
  type EmployeeLeaveRow,
} from "@/lib/employees/db-mapper";
import { isValidLeaveDate, parseLeaveStatus, parseLeaveType } from "@/lib/employees/leave-rules";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationLeave } from "@/lib/integrations/integration-mapper";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export async function OPTIONS() {
  return integrationOptions();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireIntegrationApiKey(req, "leave:write");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const leaveId = String(id ?? "").trim();
    if (!leaveId) return integrationJson({ error: "Missing leave id." }, 400);

    const { data: existing, error: fetchErr } = await auth.admin
      .from("visitor_employee_leave")
      .select(
        "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
      )
      .eq("id", leaveId)
      .eq("owner_id", auth.ownerId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingLeaveTable(fetchErr)) {
        return integrationJson(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          503
        );
      }
      return integrationJson({ error: fetchErr.message }, 500);
    }
    if (!existing) return integrationJson({ error: "Leave record not found." }, 404);

    const current = mapLeaveRow(existing as EmployeeLeaveRow);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const nextStatus = parseLeaveStatus(body.status ?? body.action);
    if (nextStatus === "approved" || nextStatus === "rejected") {
      updates.status = nextStatus;
      if (nextStatus === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.rejected_at = null;
      } else {
        updates.rejected_at = new Date().toISOString();
        updates.approved_at = null;
      }
    } else if (current.status === "pending") {
      if (body.startDate !== undefined || body.start_date !== undefined) {
        const startDate = safeText(body.startDate ?? body.start_date, 10);
        if (!isValidLeaveDate(startDate)) {
          return integrationJson({ error: "Invalid start date." }, 400);
        }
        updates.start_date = startDate;
      }
      if (body.endDate !== undefined || body.end_date !== undefined) {
        const endDate = safeText(body.endDate ?? body.end_date, 10);
        if (!isValidLeaveDate(endDate)) {
          return integrationJson({ error: "Invalid end date." }, 400);
        }
        updates.end_date = endDate;
      }
      if (body.leaveType !== undefined || body.leave_type !== undefined) {
        updates.leave_type = parseLeaveType(body.leaveType ?? body.leave_type);
      }
      if (body.notes !== undefined) updates.notes = safeText(body.notes, 500);
    } else if (Object.keys(body).length > 0 && !nextStatus) {
      return integrationJson(
        { error: "Only pending leave can be edited, or set status to approved/rejected." },
        400
      );
    }

    if (Object.keys(updates).length <= 1) {
      return integrationJson({ error: "No fields to update." }, 400);
    }

    const { data, error } = await auth.admin
      .from("visitor_employee_leave")
      .update(updates)
      .eq("id", leaveId)
      .eq("owner_id", auth.ownerId)
      .select(
        "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
      )
      .maybeSingle();

    if (error) return integrationJson({ error: error.message }, 500);
    if (!data) return integrationJson({ error: "Leave record not found." }, 404);

    return integrationJson({ leave: mapIntegrationLeave(mapLeaveRow(data as EmployeeLeaveRow)) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
