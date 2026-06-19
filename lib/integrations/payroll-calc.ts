import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";
import { buildAttendanceDailyLogRows } from "@/lib/employees/attendance-daily-log";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import { dedupeAttendanceByEmployeeDay } from "@/lib/employees/daily-attendance-rules";
import { EMPLOYEE_ATTENDANCE_SELECT, mapAttendanceRow, mapEmployeeRow, mapLeaveRow, type EmployeeAttendanceRow, type EmployeeLeaveRow, type EmployeeRow } from "@/lib/employees/db-mapper";
import { fetchOwnerReportingSettings } from "@/lib/employees/fetch-reporting-settings";
import { countLeaveDaysForEmployee } from "@/lib/employees/leave-rules";
import {
  earlyDepartureMinutes,
  lateMinutes,
  reportingWindowForMember,
} from "@/lib/employees/reporting-time";
import { hoursWorkedBetween } from "@/lib/employees/shifts";
import { eatDayKey } from "@/lib/time/eat";
import {
  DEFAULT_PAYROLL_SETTINGS,
  type EmployeePayProfile,
  type IntegrationPayrollEmployeeRow,
  type IntegrationPayrollPayload,
  type PayrollDeductionLine,
  type PayrollSettings,
} from "@/lib/integrations/payroll-types";

type EmployeeRowWithPay = EmployeeRow & {
  pay_type?: string | null;
  pay_rate?: number | string | null;
  pay_currency?: string | null;
};

type PayrollSettingsRow = {
  owner_id: string;
  currency: string;
  standard_hours_per_day: number | string;
  working_days_per_month: number | string;
  overtime_multiplier: number | string;
  late_deduction_per_minute: number | string;
  early_departure_deduction_per_minute: number | string;
  unpaid_leave_daily_deduction: number | string;
  apply_late_deductions?: boolean | null;
  apply_early_departure_deductions?: boolean | null;
  apply_overtime_pay?: boolean | null;
  apply_unpaid_leave_deductions?: boolean | null;
  updated_at: string;
};

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

export function mapPayrollSettingsRow(row: PayrollSettingsRow | null): PayrollSettings {
  if (!row) return { ...DEFAULT_PAYROLL_SETTINGS };
  return {
    currency: String(row.currency ?? "KES").trim() || "KES",
    standardHoursPerDay: num(row.standard_hours_per_day, 8),
    workingDaysPerMonth: num(row.working_days_per_month, 22),
    overtimeMultiplier: num(row.overtime_multiplier, 1.5),
    lateDeductionPerMinute: num(row.late_deduction_per_minute, 0),
    earlyDepartureDeductionPerMinute: num(row.early_departure_deduction_per_minute, 0),
    unpaidLeaveDailyDeduction: num(row.unpaid_leave_daily_deduction, 0),
    applyLateDeductions: bool(row.apply_late_deductions, false),
    applyEarlyDepartureDeductions: bool(row.apply_early_departure_deductions, false),
    applyOvertimePay: bool(row.apply_overtime_pay, false),
    applyUnpaidLeaveDeductions: bool(row.apply_unpaid_leave_deductions, false),
    updatedAt: row.updated_at ?? null,
  };
}

export function employeePayProfile(row: EmployeeRowWithPay): EmployeePayProfile {
  const payType = String(row.pay_type ?? "hourly").toLowerCase() === "monthly" ? "monthly" : "hourly";
  return {
    payType,
    payRate: num(row.pay_rate, 0),
    payCurrency: String(row.pay_currency ?? "KES").trim() || "KES",
  };
}

export async function fetchOwnerPayrollSettings(
  admin: SupabaseClient,
  ownerId: string
): Promise<PayrollSettings> {
  const { data, error } = await admin
    .from("visitor_payroll_settings")
    .select(
      "owner_id,currency,standard_hours_per_day,working_days_per_month,overtime_multiplier,late_deduction_per_minute,early_departure_deduction_per_minute,unpaid_leave_daily_deduction,apply_late_deductions,apply_early_departure_deductions,apply_overtime_pay,apply_unpaid_leave_deductions,updated_at"
    )
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("visitor_payroll_settings") || msg.includes("does not exist")) {
      return { ...DEFAULT_PAYROLL_SETTINGS };
    }
    throw error;
  }

  return mapPayrollSettingsRow((data as PayrollSettingsRow | null) ?? null);
}

function dailyRateForEmployee(
  pay: EmployeePayProfile,
  settings: PayrollSettings
): number {
  if (pay.payType === "monthly") {
    const days = settings.workingDaysPerMonth > 0 ? settings.workingDaysPerMonth : 22;
    return pay.payRate / days;
  }
  return pay.payRate * settings.standardHoursPerDay;
}

function unpaidLeaveDaysInRange(
  leaveRecords: EmployeeLeaveRecord[],
  employeeId: string,
  from: string,
  to: string
): number {
  const unpaid = leaveRecords.filter(
    (l) => l.employeeId === employeeId && l.status === "approved" && l.leaveType === "unpaid"
  );
  return countLeaveDaysForEmployee(unpaid, employeeId, from, to);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildIntegrationPayroll(params: {
  from: string;
  to: string;
  employees: EmployeeRecord[];
  employeeRows: EmployeeRowWithPay[];
  attendance: AttendanceSummaryEventRow[];
  leaveRecords: EmployeeLeaveRecord[];
  reportingSettings: EmployeeReportingSettings;
  paySettings: PayrollSettings;
}): IntegrationPayrollPayload {
  const payByEmployeeId = new Map(
    params.employeeRows.map((row) => [row.id, employeePayProfile(row)])
  );

  const dailyRows = buildAttendanceDailyLogRows(
    params.attendance,
    params.employees,
    params.reportingSettings,
    { leaveRecords: params.leaveRecords, from: params.from, to: params.to }
  );

  const rows: IntegrationPayrollEmployeeRow[] = params.employees
    .filter((e) => e.status === "active")
    .map((emp) => {
      const pay = payByEmployeeId.get(emp.id) ?? {
        payType: "hourly" as const,
        payRate: 0,
        payCurrency: params.paySettings.currency,
      };
      const currency = pay.payCurrency || params.paySettings.currency;
      const settings = params.paySettings;
      const window = reportingWindowForMember(params.reportingSettings, emp.memberType);
      const empDaily = dailyRows.filter((r) => r.employeeId === emp.id);

      let totalHours = 0;
      let overtimeHours = 0;
      let lateMins = 0;
      let earlyMins = 0;
      let daysPresent = 0;
      let daysOnLeave = 0;

      const deduped = dedupeAttendanceByEmployeeDay(
        params.attendance
          .filter((a) => a.employeeId === emp.id)
          .map((a) => ({
            id: a.id,
            employeeId: a.employeeId,
            eventType: a.eventType,
            deviceId: null,
            deviceLabel: null,
            deviceInfo: {},
            createdAt: a.createdAt,
          }))
      );

      const signInByDay = new Map<string, string>();
      const signOutByDay = new Map<string, string>();
      for (const ev of deduped) {
        const dayKey = eatDayKey(ev.createdAt);
        if (ev.eventType === "sign_in") signInByDay.set(dayKey, ev.createdAt);
        else signOutByDay.set(dayKey, ev.createdAt);
      }

      for (const row of empDaily) {
        if (row.status === "on_leave") {
          daysOnLeave += 1;
          continue;
        }
        daysPresent += 1;
        const signIn = signInByDay.get(row.dayKey) ?? null;
        const signOut = signOutByDay.get(row.dayKey) ?? null;

        if (settings.applyLateDeductions) {
          lateMins += lateMinutes(signIn, window);
        }
        if (settings.applyEarlyDepartureDeductions) {
          earlyMins += earlyDepartureMinutes(signOut, window.signOut);
        }

        if (signIn && signOut) {
          const hours = hoursWorkedBetween(signIn, signOut);
          totalHours += hours;
          if (settings.applyOvertimePay) {
            const standard = settings.standardHoursPerDay;
            if (hours > standard) overtimeHours += hours - standard;
          }
        }
      }

      const unpaidLeaveDays = unpaidLeaveDaysInRange(
        params.leaveRecords,
        emp.id,
        params.from,
        params.to
      );

      const dailyRate = dailyRateForEmployee(pay, params.paySettings);
      let grossPay = 0;

      if (pay.payType === "hourly") {
        if (settings.applyOvertimePay) {
          const regularHours = Math.max(0, totalHours - overtimeHours);
          grossPay =
            regularHours * pay.payRate + overtimeHours * pay.payRate * settings.overtimeMultiplier;
        } else {
          grossPay = totalHours * pay.payRate;
        }
      } else {
        grossPay = dailyRate * daysPresent;
      }

      const deductions: PayrollDeductionLine[] = [];

      if (
        settings.applyLateDeductions &&
        lateMins > 0 &&
        settings.lateDeductionPerMinute > 0
      ) {
        const amount = roundMoney(lateMins * settings.lateDeductionPerMinute);
        deductions.push({
          code: "late_arrival",
          label: "Late arrival",
          amount,
          minutes: lateMins,
        });
      }

      if (
        settings.applyEarlyDepartureDeductions &&
        earlyMins > 0 &&
        settings.earlyDepartureDeductionPerMinute > 0
      ) {
        const amount = roundMoney(earlyMins * settings.earlyDepartureDeductionPerMinute);
        deductions.push({
          code: "early_departure",
          label: "Early departure",
          amount,
          minutes: earlyMins,
        });
      }

      if (settings.applyUnpaidLeaveDeductions && unpaidLeaveDays > 0) {
        const perDay =
          settings.unpaidLeaveDailyDeduction > 0
            ? settings.unpaidLeaveDailyDeduction
            : dailyRate;
        const amount = roundMoney(unpaidLeaveDays * perDay);
        deductions.push({
          code: "unpaid_leave",
          label: "Unpaid leave",
          amount,
          days: unpaidLeaveDays,
        });
      }

      const totalDeductions = roundMoney(deductions.reduce((s, d) => s + d.amount, 0));
      grossPay = roundMoney(grossPay);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp.department,
        payType: pay.payType,
        payRate: pay.payRate,
        currency,
        daysPresent,
        daysOnLeave,
        unpaidLeaveDays,
        totalHoursWorked: roundMoney(totalHours),
        overtimeHours: roundMoney(overtimeHours),
        lateMinutes: lateMins,
        earlyDepartureMinutes: earlyMins,
        grossPay,
        deductions,
        totalDeductions,
        netPay: roundMoney(Math.max(0, grossPay - totalDeductions)),
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const totals = rows.reduce(
    (acc, r) => ({
      grossPay: roundMoney(acc.grossPay + r.grossPay),
      totalDeductions: roundMoney(acc.totalDeductions + r.totalDeductions),
      netPay: roundMoney(acc.netPay + r.netPay),
    }),
    { grossPay: 0, totalDeductions: 0, netPay: 0 }
  );

  return {
    from: params.from,
    to: params.to,
    currency: params.paySettings.currency,
    settings: params.paySettings,
    employees: rows,
    totals,
  };
}

export async function loadPayrollPayload(
  admin: SupabaseClient,
  ownerId: string,
  from: string,
  to: string,
  employeeId?: string
): Promise<IntegrationPayrollPayload | { setupRequired: true }> {
  const reportingSettings = await fetchOwnerReportingSettings(admin, ownerId);
  const paySettings = await fetchOwnerPayrollSettings(admin, ownerId);

  let empQuery = admin
    .from("visitor_employees")
    .select(
      "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,pay_type,pay_rate,pay_currency,created_at,updated_at"
    )
    .eq("owner_id", ownerId)
    .order("full_name", { ascending: true });

  if (employeeId) empQuery = empQuery.eq("id", employeeId);

  const { data: empData, error: empErr } = await empQuery;
  if (empErr) {
    const msg = String(empErr.message ?? "").toLowerCase();
    if (msg.includes("visitor_employees") || msg.includes("does not exist")) {
      return { setupRequired: true };
    }
    throw empErr;
  }

  const employeeRows = (empData ?? []) as EmployeeRowWithPay[];
  const employees = employeeRows.map(mapEmployeeRow);

  const fromIso = `${from}T00:00:00+03:00`;
  const toIso = `${to}T23:59:59.999+03:00`;

  let attQuery = admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("owner_id", ownerId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });

  if (employeeId) attQuery = attQuery.eq("employee_id", employeeId);

  const { data: attData } = await attQuery;
  const attendance = ((attData ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow).map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeName: "",
    eventType: a.eventType,
    eventLabel: a.eventType === "sign_in" ? "Sign in" : "Sign out",
    createdAt: a.createdAt,
    displayTime: "",
    displayDate: "",
  }));

  let leaveQuery = admin
    .from("visitor_employee_leave")
    .select(
      "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at"
    )
    .eq("owner_id", ownerId)
    .lte("start_date", to)
    .gte("end_date", from);

  if (employeeId) leaveQuery = leaveQuery.eq("employee_id", employeeId);

  const { data: leaveData } = await leaveQuery;
  const leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);

  return buildIntegrationPayroll({
    from,
    to,
    employees,
    employeeRows,
    attendance,
    leaveRecords,
    reportingSettings,
    paySettings,
  });
}
