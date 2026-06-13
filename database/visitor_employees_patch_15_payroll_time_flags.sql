-- Fusion Xpress — Payroll: optional time-based rules (Patch 15)
-- Run after visitor_employees_patch_14_payroll.sql if that patch was applied without these columns.
-- -----------------------------------------------------------------------------

alter table public.visitor_payroll_settings
  add column if not exists apply_late_deductions boolean not null default false,
  add column if not exists apply_early_departure_deductions boolean not null default false,
  add column if not exists apply_overtime_pay boolean not null default false,
  add column if not exists apply_unpaid_leave_deductions boolean not null default false;

comment on column public.visitor_payroll_settings.apply_late_deductions is
  'When true, deduct lateDeductionPerMinute × minutes late after reporting window.';
comment on column public.visitor_payroll_settings.apply_early_departure_deductions is
  'When true, deduct earlyDepartureDeductionPerMinute × minutes left before sign-out.';
comment on column public.visitor_payroll_settings.apply_overtime_pay is
  'When true, hours above standardHoursPerDay use overtimeMultiplier.';
comment on column public.visitor_payroll_settings.apply_unpaid_leave_deductions is
  'When true, deduct unpaidLeaveDailyDeduction (or prorated daily rate) per unpaid leave day.';
