import { NextRequest } from "next/server";

import {
  isMissingEmployeesTable,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationEmployee } from "@/lib/integrations/integration-mapper";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "employees:read");
    if ("error" in auth) return auth.error;

    const status = req.nextUrl.searchParams.get("status")?.trim().toLowerCase() ?? "";

    let q = auth.admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,pay_type,pay_rate,pay_currency,created_at,updated_at"
      )
      .eq("owner_id", auth.ownerId)
      .order("full_name", { ascending: true })
      .limit(1000);

    if (status === "active" || status === "inactive") {
      q = q.eq("status", status);
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return integrationJson({ employees: [], setupRequired: true }, 503);
      }
      return integrationJson({ error: error.message }, 500);
    }

    const employees = ((data ?? []) as (EmployeeRow & {
      pay_type?: string | null;
      pay_rate?: number | null;
      pay_currency?: string | null;
    })[]).map((row) =>
      mapIntegrationEmployee(mapEmployeeRow(row), {
        payType: row.pay_type,
        payRate: row.pay_rate,
        payCurrency: row.pay_currency,
      })
    );
    return integrationJson({ employees, count: employees.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
