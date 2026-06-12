-- Fusion Xpress — Multi-shift support for retail/hospitality (Patch 10)
-- Run after visitor_employees_patch_03_real_estate_crm.sql and patch_06_reporting_windows.sql
-- Shifts: 1st (6am-3pm), 2nd (3pm-11pm)

-- Add shift columns to visitor_employee_reporting_settings
alter table public.visitor_employee_reporting_settings
  add column if not exists shift_enabled boolean default false,
  add column if not exists shift_1_start_time time not null default '06:00',
  add column if not exists shift_1_end_time time not null default '15:00',
  add column if not exists shift_2_start_time time not null default '15:00',
  add column if not exists shift_2_end_time time not null default '23:00',
  add column if not exists shift_1_sign_in_start_time time not null default '06:00',
  add column if not exists shift_1_sign_in_time time not null default '08:00',
  add column if not exists shift_1_sign_out_time time not null default '15:00',
  add column if not exists shift_2_sign_in_start_time time not null default '15:00',
  add column if not exists shift_2_sign_in_time time not null default '16:00',
  add column if not exists shift_2_sign_out_time time not null default '23:00';

-- Track which shift each sign-in/out belongs to (table from patch_01)
alter table public.visitor_employee_attendance
  add column if not exists shift_number integer default null;

create index if not exists visitor_employee_attendance_employee_shift_idx
  on public.visitor_employee_attendance (employee_id, created_at desc, shift_number);

comment on column public.visitor_employee_attendance.shift_number is
  'Shift 1 or 2 for retail/hospitality multi-shift accounts; null for single-window orgs.';

comment on column public.visitor_employee_reporting_settings.shift_enabled is
  'Enable multi-shift support for retail/hospitality accounts';

comment on column public.visitor_employee_reporting_settings.shift_1_start_time is
  'Shift 1 start time (e.g., 06:00 for 6am)';

comment on column public.visitor_employee_reporting_settings.shift_1_end_time is
  'Shift 1 end time (e.g., 15:00 for 3pm)';

comment on column public.visitor_employee_reporting_settings.shift_2_start_time is
  'Shift 2 start time (e.g., 15:00 for 3pm)';

comment on column public.visitor_employee_reporting_settings.shift_2_end_time is
  'Shift 2 end time (e.g., 23:00 for 11pm)';

notify pgrst, 'reload schema';
