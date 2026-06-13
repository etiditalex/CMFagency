import { NextRequest } from "next/server";

import {
  isMissingEmployeesTable,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { findEmployeeDuplicate } from "@/lib/employees/employee-uniqueness";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import { mapIntegrationEmployee } from "@/lib/integrations/integration-mapper";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

function safeText(v: unknown, max: number) {
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
    const auth = await requireIntegrationApiKey(req, "employees:write");
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!id) return integrationJson({ error: "Missing id" }, 400);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (body.fullName !== undefined || body.full_name !== undefined) {
      const full_name = safeText(body.fullName ?? body.full_name, 200);
      if (!full_name) return integrationJson({ error: "Full name cannot be empty." }, 400);
      patch.full_name = full_name;
    }
    if (body.email !== undefined) {
      const emailRaw = safeText(body.email, 200);
      patch.email = emailRaw && emailRaw.includes("@") ? emailRaw : null;
    }
    if (body.department !== undefined) patch.department = safeText(body.department, 120);
    if (body.jobTitle !== undefined || body.job_title !== undefined) {
      patch.job_title = safeText(body.jobTitle ?? body.job_title, 120);
    }
    if (body.employeeCode !== undefined || body.employee_code !== undefined) {
      patch.employee_code = safeText(body.employeeCode ?? body.employee_code, 64) || null;
    }
    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      if (status !== "active" && status !== "inactive") {
        return integrationJson({ error: "Invalid status." }, 400);
      }
      patch.status = status;
    }
    if (body.payType !== undefined || body.pay_type !== undefined) {
      const payType = String(body.payType ?? body.pay_type).toLowerCase();
      if (payType !== "hourly" && payType !== "monthly") {
        return integrationJson({ error: "payType must be hourly or monthly." }, 400);
      }
      patch.pay_type = payType;
    }
    if (body.payRate !== undefined || body.pay_rate !== undefined) {
      const rate = Number(body.payRate ?? body.pay_rate);
      if (!Number.isFinite(rate) || rate < 0) {
        return integrationJson({ error: "payRate must be a non-negative number." }, 400);
      }
      patch.pay_rate = rate;
    }
    if (body.payCurrency !== undefined || body.pay_currency !== undefined) {
      patch.pay_currency = safeText(body.payCurrency ?? body.pay_currency, 8) || "KES";
    }

    if (Object.keys(patch).length === 0) {
      return integrationJson({ error: "No fields to update." }, 400);
    }

    const { data: existingRow, error: fetchErr } = await auth.admin
      .from("visitor_employees")
      .select("id,owner_id,full_name,email")
      .eq("id", id)
      .eq("owner_id", auth.ownerId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingEmployeesTable(fetchErr)) {
        return integrationJson({ error: "Employee tables not set up." }, 503);
      }
      return integrationJson({ error: fetchErr.message }, 500);
    }
    if (!existingRow) return integrationJson({ error: "Employee not found." }, 404);

    const nextName = safeText(patch.full_name ?? existingRow.full_name, 200);
    const nextEmail =
      patch.email !== undefined
        ? (patch.email as string | null)
        : (existingRow.email as string | null);

    const duplicate = await findEmployeeDuplicate(auth.admin, auth.ownerId, {
      email: nextEmail,
      fullName: nextName,
      excludeEmployeeId: id,
    });
    if (duplicate) return integrationJson({ error: duplicate.message }, 400);

    const { data, error } = await auth.admin
      .from("visitor_employees")
      .update(patch)
      .eq("id", id)
      .eq("owner_id", auth.ownerId)
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,pay_type,pay_rate,pay_currency,created_at,updated_at"
      )
      .maybeSingle();

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (msg.includes("pay_type") || msg.includes("pay_rate")) {
        return integrationJson(
          { error: "Run database/visitor_employees_patch_14_payroll.sql in Supabase." },
          503
        );
      }
      return integrationJson({ error: error.message }, 500);
    }
    if (!data) return integrationJson({ error: "Employee not found." }, 404);

    const row = data as EmployeeRow & {
      pay_type?: string | null;
      pay_rate?: number | null;
      pay_currency?: string | null;
    };

    return integrationJson({
      employee: mapIntegrationEmployee(mapEmployeeRow(row), {
        payType: row.pay_type,
        payRate: row.pay_rate,
        payCurrency: row.pay_currency,
      }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
