export type EmployeePayType = "hourly" | "monthly";

export type PayrollSettings = {
  currency: string;
  standardHoursPerDay: number;
  workingDaysPerMonth: number;
  overtimeMultiplier: number;
  lateDeductionPerMinute: number;
  earlyDepartureDeductionPerMinute: number;
  unpaidLeaveDailyDeduction: number;
  /** Opt-in: deduct for minutes late after reporting window. */
  applyLateDeductions: boolean;
  /** Opt-in: deduct for leaving before expected sign-out. */
  applyEarlyDepartureDeductions: boolean;
  /** Opt-in: pay overtime above standardHoursPerDay at overtimeMultiplier. */
  applyOvertimePay: boolean;
  /** Opt-in: deduct for approved unpaid leave days. */
  applyUnpaidLeaveDeductions: boolean;
  updatedAt: string | null;
};

export type EmployeePayProfile = {
  payType: EmployeePayType;
  payRate: number;
  payCurrency: string;
};

export type PayrollDeductionLine = {
  code: "late_arrival" | "early_departure" | "unpaid_leave" | "other";
  label: string;
  amount: number;
  minutes?: number;
  days?: number;
};

export type IntegrationPayrollEmployeeRow = {
  employeeId: string;
  employeeCode: string | null;
  fullName: string;
  department: string;
  payType: EmployeePayType;
  payRate: number;
  currency: string;
  daysPresent: number;
  daysOnLeave: number;
  unpaidLeaveDays: number;
  totalHoursWorked: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  grossPay: number;
  deductions: PayrollDeductionLine[];
  totalDeductions: number;
  netPay: number;
};

export type IntegrationPayrollPayload = {
  from: string;
  to: string;
  currency: string;
  settings: PayrollSettings;
  employees: IntegrationPayrollEmployeeRow[];
  totals: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
};

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  currency: "KES",
  standardHoursPerDay: 8,
  workingDaysPerMonth: 22,
  overtimeMultiplier: 1.5,
  lateDeductionPerMinute: 0,
  earlyDepartureDeductionPerMinute: 0,
  unpaidLeaveDailyDeduction: 0,
  applyLateDeductions: false,
  applyEarlyDepartureDeductions: false,
  applyOvertimePay: false,
  applyUnpaidLeaveDeductions: false,
  updatedAt: null,
};
