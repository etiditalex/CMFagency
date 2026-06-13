import { NextRequest } from "next/server";

import { INTEGRATION_SCOPES } from "@/lib/integrations/api-key";
import { integrationJson, integrationOptions } from "@/lib/integrations/integration-http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return integrationOptions();
}

/** API discovery for HR / payroll integrators. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const base = `${origin}/api/integrations/v1`;

  return integrationJson({
    name: "Fusion Xpress Employee Integration API",
    version: "1",
    authentication: {
      type: "bearer",
      header: "Authorization: Bearer fx_int_live_…",
      note: "Create keys in Dashboard → Visitor Management → Employees → Integrations.",
    },
    timezone: "Africa/Nairobi (EAT)",
    capabilities: [
      "Read and update employee records and pay rates",
      "Create and approve leave from external HR systems",
      "Automated payroll runs with time-based deductions",
    ],
    endpoints: [
      {
        method: "GET",
        path: `${base}/employees`,
        scope: "employees:read",
        description: "Active and inactive employees with pay rates.",
      },
      {
        method: "PATCH",
        path: `${base}/employees/{id}`,
        scope: "employees:write",
        description: "Update employee profile, status, payType (hourly|monthly), and payRate.",
      },
      {
        method: "GET",
        path: `${base}/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD`,
        scope: "attendance:read",
        description: "Raw sign-in and sign-out events in the date range (EAT calendar days).",
        query: ["from", "to", "employeeId", "limit"],
      },
      {
        method: "GET",
        path: `${base}/leave?from=YYYY-MM-DD&to=YYYY-MM-DD`,
        scope: "leave:read",
        description: "Leave records overlapping the date range.",
        query: ["from", "to", "employeeId", "status"],
      },
      {
        method: "POST",
        path: `${base}/leave`,
        scope: "leave:write",
        description: "Create a leave record (pending, approved, or rejected).",
      },
      {
        method: "PATCH",
        path: `${base}/leave/{id}`,
        scope: "leave:write",
        description: "Update pending leave or approve/reject a request.",
      },
      {
        method: "GET",
        path: `${base}/daily-register?from=YYYY-MM-DD&to=YYYY-MM-DD`,
        scope: "register:read",
        description:
          "One row per employee per day — present with sign-in/out times or on approved leave.",
        query: ["from", "to", "employeeId"],
      },
      {
        method: "GET",
        path: `${base}/payroll-settings`,
        scope: "payroll:read",
        description: "Organisation payroll rules — deduction rates, overtime, standard hours.",
      },
      {
        method: "PUT",
        path: `${base}/payroll-settings`,
        scope: "payroll:write",
        description:
          "Configure deduction rates, overtime multiplier, and opt-in flags for time-based payroll rules.",
      },
      {
        method: "GET",
        path: `${base}/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD`,
        scope: "payroll:read",
        description:
          "Payroll run — hours or days worked, gross pay, optional time-based deductions, and net pay.",
        query: ["from", "to", "employeeId"],
      },
    ],
    payroll: {
      payTypes: ["hourly", "monthly"],
      defaultMode:
        "Simple pay only (hours × rate or days × daily rate). Time rules are off until you enable them in payroll-settings.",
      optionalTimeRules: {
        applyLateDeductions: "Deduct for late sign-in after reporting window",
        applyEarlyDepartureDeductions: "Deduct for leaving before expected sign-out",
        applyOvertimePay: "Pay overtime above standardHoursPerDay at overtimeMultiplier",
        applyUnpaidLeaveDeductions: "Deduct for approved unpaid leave days",
      },
      deductions: [
        {
          code: "late_arrival",
          optional: true,
          requires: "applyLateDeductions: true",
          description: "Minutes late × lateDeductionPerMinute",
        },
        {
          code: "early_departure",
          optional: true,
          requires: "applyEarlyDepartureDeductions: true",
          description: "Minutes early × earlyDepartureDeductionPerMinute",
        },
        {
          code: "unpaid_leave",
          optional: true,
          requires: "applyUnpaidLeaveDeductions: true",
          description: "Unpaid leave days × daily deduction rate",
        },
      ],
      overtime: {
        optional: true,
        requires: "applyOvertimePay: true",
        description: "Hours above standardHoursPerDay × rate × overtimeMultiplier",
      },
    },
    scopes: [...INTEGRATION_SCOPES],
  });
}
