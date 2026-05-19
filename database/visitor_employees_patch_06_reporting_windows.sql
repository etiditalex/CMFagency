-- Fusion Xpress — Sign-in window + reporting defaults (Patch 06)
-- Run after visitor_employees_patch_03_real_estate_crm.sql
-- Sign-in on time between start and latest; after latest = late. Sign-out from configured time (default 5pm).

alter table public.visitor_employee_reporting_settings
  add column if not exists staff_reporting_sign_in_start time not null default '07:00',
  add column if not exists crm_reporting_sign_in_start time not null default '07:00';

comment on column public.visitor_employee_reporting_settings.staff_reporting_sign_in is
  'Latest time staff may sign in and still be on time (e.g. 08:00).';
comment on column public.visitor_employee_reporting_settings.staff_reporting_sign_in_start is
  'Earliest expected staff sign-in (e.g. 07:00).';
comment on column public.visitor_employee_reporting_settings.staff_reporting_sign_out is
  'Expected sign-out from this time (e.g. 17:00).';

alter table public.visitor_employee_reporting_settings
  alter column staff_reporting_sign_in set default '08:00',
  alter column staff_reporting_sign_out set default '17:00',
  alter column crm_reporting_sign_in set default '08:00',
  alter column crm_reporting_sign_out set default '17:00';

update public.visitor_employee_reporting_settings
set
  staff_reporting_sign_in_start = coalesce(staff_reporting_sign_in_start, '07:00'::time),
  crm_reporting_sign_in_start = coalesce(crm_reporting_sign_in_start, '07:00'::time),
  staff_reporting_sign_in = case
    when staff_reporting_sign_in = '09:00'::time then '08:00'::time
    else staff_reporting_sign_in
  end,
  staff_reporting_sign_out = case
    when staff_reporting_sign_out = '17:00'::time then staff_reporting_sign_out
    else coalesce(staff_reporting_sign_out, '17:00'::time)
  end,
  updated_at = now()
where true;

notify pgrst, 'reload schema';
