import { NextRequest } from "next/server";

import {
  isMissingEmployeesTable,
  mapAttendanceRow,
  type EmployeeAttendanceRow,
} from "@/lib/employees/db-mapper";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationAttendanceEvent } from "@/lib/integrations/integration-mapper";
import { integrationLimit, parseIntegrationDateRange } from "@/lib/integrations/integration-query";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "attendance:read");
    if ("error" in auth) return auth.error;

    const parsed = parseIntegrationDateRange(
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to")
    );
    if ("error" in parsed) {
      return integrationJson({ error: parsed.error }, 400);
    }

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";
    const limit = integrationLimit(req.nextUrl.searchParams.get("limit"), 5000);

    let q = auth.admin
      .from("visitor_employee_attendance")
      .select("id,employee_id,owner_id,event_type,device_id,device_label,device_info,created_at")
      .eq("owner_id", auth.ownerId)
      .gte("created_at", parsed.fromIso)
      .lte("created_at", parsed.toIso)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (employeeId) q = q.eq("employee_id", employeeId);

    const { data, error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return integrationJson({ events: [], setupRequired: true }, 503);
      }
      return integrationJson({ error: error.message }, 500);
    }

    const events = ((data ?? []) as EmployeeAttendanceRow[])
      .map(mapAttendanceRow)
      .map(mapIntegrationAttendanceEvent);

    return integrationJson({
      from: parsed.from,
      to: parsed.to,
      events,
      count: events.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
