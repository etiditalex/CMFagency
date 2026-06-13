import { NextRequest } from "next/server";

import {
  isMissingEmployeesTable,
  isMissingLeaveTable,
  mapLeaveRow,
  type EmployeeLeaveRow,
} from "@/lib/employees/db-mapper";
import { isValidLeaveDate, parseLeaveType } from "@/lib/employees/leave-rules";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationLeave } from "@/lib/integrations/integration-mapper";
import { parseIntegrationDateRange } from "@/lib/integrations/integration-query";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "leave:read");
    if ("error" in auth) return auth.error;

    const fromRaw = req.nextUrl.searchParams.get("from")?.trim() ?? "";
    const toRaw = req.nextUrl.searchParams.get("to")?.trim() ?? "";
    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";
    const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";

    let from = "";
    let to = "";
    if (fromRaw && toRaw) {
      const parsed = parseIntegrationDateRange(fromRaw, toRaw);
      if ("error" in parsed) {
        return integrationJson({ error: parsed.error }, 400);
      }
      from = parsed.from;
      to = parsed.to;
    }

    let q = auth.admin
      .from("visitor_employee_leave")
      .select(
        "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
      )
      .eq("owner_id", auth.ownerId)
      .order("start_date", { ascending: false })
      .limit(2000);

    if (employeeId) q = q.eq("employee_id", employeeId);
    if (status === "pending" || status === "approved" || status === "rejected") {
      q = q.eq("status", status);
    }
    if (from && isValidLeaveDate(from)) q = q.gte("end_date", from);
    if (to && isValidLeaveDate(to)) q = q.lte("start_date", to);

    const { data, error } = await q;
    if (error) {
      if (isMissingLeaveTable(error) || isMissingEmployeesTable(error)) {
        return integrationJson({ leave: [], setupRequired: true }, 503);
      }
      return integrationJson({ error: error.message }, 500);
    }

    const leave = ((data ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow).map(mapIntegrationLeave);

    return integrationJson({
      from: from || null,
      to: to || null,
      leave,
      count: leave.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "leave:write");
    if ("error" in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = safeText(body.employeeId ?? body.employee_id, 80);
    const startDate = safeText(body.startDate ?? body.start_date, 10);
    const endDate = safeText(body.endDate ?? body.end_date, 10);
    const leaveType = parseLeaveType(body.leaveType ?? body.leave_type);
    const notes = safeText(body.notes, 500);
    const statusRaw = safeText(body.status, 20).toLowerCase();
    const status =
      statusRaw === "approved" || statusRaw === "rejected" ? statusRaw : "pending";

    if (!employeeId) return integrationJson({ error: "employeeId is required." }, 400);
    if (!isValidLeaveDate(startDate) || !isValidLeaveDate(endDate)) {
      return integrationJson({ error: "Use valid start and end dates (YYYY-MM-DD)." }, 400);
    }
    if (endDate < startDate) {
      return integrationJson({ error: "End date must be on or after start date." }, 400);
    }

    const { data: empRow, error: empErr } = await auth.admin
      .from("visitor_employees")
      .select("id")
      .eq("id", employeeId)
      .eq("owner_id", auth.ownerId)
      .maybeSingle();

    if (empErr) {
      if (isMissingEmployeesTable(empErr)) {
        return integrationJson({ error: "Employee module not set up." }, 503);
      }
      return integrationJson({ error: empErr.message }, 500);
    }
    if (!empRow) return integrationJson({ error: "Employee not found." }, 404);

    const insert: Record<string, unknown> = {
      owner_id: auth.ownerId,
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      status,
      notes,
    };
    if (status === "approved") insert.approved_at = new Date().toISOString();
    if (status === "rejected") insert.rejected_at = new Date().toISOString();

    const { data, error } = await auth.admin
      .from("visitor_employee_leave")
      .insert(insert)
      .select(
        "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
      )
      .single();

    if (error) {
      if (isMissingLeaveTable(error)) {
        return integrationJson(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          503
        );
      }
      return integrationJson({ error: error.message }, 500);
    }

    return integrationJson({ leave: mapIntegrationLeave(mapLeaveRow(data as EmployeeLeaveRow)) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
