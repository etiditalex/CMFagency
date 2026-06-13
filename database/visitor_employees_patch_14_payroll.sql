-- Fusion Xpress — Employee module: payroll settings for External API (Patch 14)
-- Run after visitor_employees_patch_13_integration_api.sql
-- -----------------------------------------------------------------------------

alter table public.visitor_employees
  add column if not exists pay_type text not null default 'hourly'
    check (pay_type in ('hourly', 'monthly')),
  add column if not exists pay_rate numeric(12, 2) not null default 0,
  add column if not exists pay_currency text not null default 'KES';

comment on column public.visitor_employees.pay_type is
  'hourly = rate per hour worked; monthly = fixed salary prorated by attendance days.';
comment on column public.visitor_employees.pay_rate is
  'Hourly rate (KES/hour) or monthly gross salary depending on pay_type.';

create table if not exists public.visitor_payroll_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'KES',
  standard_hours_per_day numeric(4, 2) not null default 8,
  working_days_per_month numeric(4, 1) not null default 22,
  overtime_multiplier numeric(4, 2) not null default 1.5,
  late_deduction_per_minute numeric(12, 2) not null default 0,
  early_departure_deduction_per_minute numeric(12, 2) not null default 0,
  unpaid_leave_daily_deduction numeric(12, 2) not null default 0,
  apply_late_deductions boolean not null default false,
  apply_early_departure_deductions boolean not null default false,
  apply_overtime_pay boolean not null default false,
  apply_unpaid_leave_deductions boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.visitor_payroll_settings is
  'Organisation payroll rules. Time-based overtime and deductions are opt-in (apply_* flags default false).';

drop trigger if exists set_visitor_payroll_settings_updated_at on public.visitor_payroll_settings;
create trigger set_visitor_payroll_settings_updated_at
before update on public.visitor_payroll_settings
for each row execute function public.set_updated_at();

alter table public.visitor_payroll_settings enable row level security;
