import { NextRequest } from "next/server";

import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";
import {
  fetchOwnerPayrollSettings,
  mapPayrollSettingsRow,
} from "@/lib/integrations/payroll-calc";
import { DEFAULT_PAYROLL_SETTINGS } from "@/lib/integrations/payroll-types";
import { requireIntegrationApiKey } from "@/lib/integrations/require-integration-api-key";

export const dynamic = "force-dynamic";

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.slice(0, max) || "";
}

function pickBool(body: Record<string, unknown>, camel: string, snake: string, current: boolean): boolean {
  if (body[camel] !== undefined) return bool(body[camel], current);
  if (body[snake] !== undefined) return bool(body[snake], current);
  return current;
}

export async function OPTIONS() {
  return integrationOptions();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "payroll:read");
    if ("error" in auth) return auth.error;

    const settings = await fetchOwnerPayrollSettings(auth.admin, auth.ownerId);
    return integrationJson({ settings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireIntegrationApiKey(req, "payroll:write");
    if ("error" in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const current = await fetchOwnerPayrollSettings(auth.admin, auth.ownerId);

    const patch = {
      owner_id: auth.ownerId,
      currency:
        body.currency !== undefined ? safeText(body.currency, 8) || "KES" : current.currency,
      standard_hours_per_day:
        body.standardHoursPerDay !== undefined || body.standard_hours_per_day !== undefined
          ? num(body.standardHoursPerDay ?? body.standard_hours_per_day, current.standardHoursPerDay)
          : current.standardHoursPerDay,
      working_days_per_month:
        body.workingDaysPerMonth !== undefined || body.working_days_per_month !== undefined
          ? num(body.workingDaysPerMonth ?? body.working_days_per_month, current.workingDaysPerMonth)
          : current.workingDaysPerMonth,
      overtime_multiplier:
        body.overtimeMultiplier !== undefined || body.overtime_multiplier !== undefined
          ? num(body.overtimeMultiplier ?? body.overtime_multiplier, current.overtimeMultiplier)
          : current.overtimeMultiplier,
      late_deduction_per_minute:
        body.lateDeductionPerMinute !== undefined || body.late_deduction_per_minute !== undefined
          ? num(body.lateDeductionPerMinute ?? body.late_deduction_per_minute, 0)
          : current.lateDeductionPerMinute,
      early_departure_deduction_per_minute:
        body.earlyDepartureDeductionPerMinute !== undefined ||
        body.early_departure_deduction_per_minute !== undefined
          ? num(
              body.earlyDepartureDeductionPerMinute ?? body.early_departure_deduction_per_minute,
              0
            )
          : current.earlyDepartureDeductionPerMinute,
      unpaid_leave_daily_deduction:
        body.unpaidLeaveDailyDeduction !== undefined || body.unpaid_leave_daily_deduction !== undefined
          ? num(body.unpaidLeaveDailyDeduction ?? body.unpaid_leave_daily_deduction, 0)
          : current.unpaidLeaveDailyDeduction,
      apply_late_deductions: pickBool(
        body,
        "applyLateDeductions",
        "apply_late_deductions",
        current.applyLateDeductions ?? DEFAULT_PAYROLL_SETTINGS.applyLateDeductions
      ),
      apply_early_departure_deductions: pickBool(
        body,
        "applyEarlyDepartureDeductions",
        "apply_early_departure_deductions",
        current.applyEarlyDepartureDeductions ?? DEFAULT_PAYROLL_SETTINGS.applyEarlyDepartureDeductions
      ),
      apply_overtime_pay: pickBool(
        body,
        "applyOvertimePay",
        "apply_overtime_pay",
        current.applyOvertimePay ?? DEFAULT_PAYROLL_SETTINGS.applyOvertimePay
      ),
      apply_unpaid_leave_deductions: pickBool(
        body,
        "applyUnpaidLeaveDeductions",
        "apply_unpaid_leave_deductions",
        current.applyUnpaidLeaveDeductions ?? DEFAULT_PAYROLL_SETTINGS.applyUnpaidLeaveDeductions
      ),
    };

    const { data, error } = await auth.admin
      .from("visitor_payroll_settings")
      .upsert(patch, { onConflict: "owner_id" })
      .select(
        "owner_id,currency,standard_hours_per_day,working_days_per_month,overtime_multiplier,late_deduction_per_minute,early_departure_deduction_per_minute,unpaid_leave_daily_deduction,apply_late_deductions,apply_early_departure_deductions,apply_overtime_pay,apply_unpaid_leave_deductions,updated_at"
      )
      .single();

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (msg.includes("visitor_payroll_settings") || msg.includes("does not exist")) {
        return integrationJson(
          {
            error:
              "Run database/visitor_employees_patch_14_payroll.sql and visitor_employees_patch_15_payroll_time_flags.sql in Supabase.",
          },
          503
        );
      }
      if (msg.includes("apply_late_deductions") || msg.includes("apply_overtime_pay")) {
        return integrationJson(
          { error: "Run database/visitor_employees_patch_15_payroll_time_flags.sql in Supabase." },
          503
        );
      }
      return integrationJson({ error: error.message }, 500);
    }

    return integrationJson({ settings: mapPayrollSettingsRow(data) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return integrationJson({ error: msg }, 500);
  }
}
