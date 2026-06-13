import { NextRequest } from "next/server";

import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { loadPayrollPayload } from "@/lib/integrations/payroll-calc";
import { parseIntegrationDateRange } from "@/lib/integrations/integration-query";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

/** Automated payroll run — hours, gross pay, time-based deductions, net pay. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "payroll:read");
    if ("error" in auth) return auth.error;

    const parsed = parseIntegrationDateRange(
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to")
    );
    if ("error" in parsed) {
      return integrationJson({ error: parsed.error }, 400);
    }

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";
    const result = await loadPayrollPayload(
      auth.admin,
      auth.ownerId,
      parsed.from,
      parsed.to,
      employeeId || undefined
    );

    if ("setupRequired" in result) {
      return integrationJson({ setupRequired: true, employees: [], totals: null }, 503);
    }

    return integrationJson(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
