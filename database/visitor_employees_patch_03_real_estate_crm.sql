-- Fusion Xpress — Employee module: Real Estate CRM + reporting times (Patch 03)
-- Run after visitor_employees_patch_01.sql (and patch 02 if used)
-- -----------------------------------------------------------------------------

-- Staff vs CRM (real estate client relationship managers)
alter table public.visitor_employees
  add column if not exists member_type text not null default 'staff'
    check (member_type in ('staff', 'crm'));

create index if not exists visitor_employees_owner_member_type_idx
  on public.visitor_employees (owner_id, member_type);

comment on column public.visitor_employees.member_type is
  'staff = general employees; crm = real-estate CRM team (separate reporting times).';

-- Per-organisation expected reporting windows (admin dashboard)
create table if not exists public.visitor_employee_reporting_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  staff_reporting_sign_in time not null default '09:00',
  staff_reporting_sign_out time not null default '17:00',
  crm_reporting_sign_in time not null default '08:30',
  crm_reporting_sign_out time not null default '18:00',
  updated_at timestamptz not null default now()
);

comment on table public.visitor_employee_reporting_settings is
  'Expected sign-in/out reporting times for staff vs CRM (real estate organisations).';

drop trigger if exists set_visitor_employee_reporting_settings_updated_at
  on public.visitor_employee_reporting_settings;
create trigger set_visitor_employee_reporting_settings_updated_at
before update on public.visitor_employee_reporting_settings
for each row execute function public.set_updated_at();

alter table public.visitor_employee_reporting_settings enable row level security;

drop policy if exists "visitor_employee_reporting_settings_select" on public.visitor_employee_reporting_settings;
create policy "visitor_employee_reporting_settings_select"
on public.visitor_employee_reporting_settings for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_reporting_settings_insert" on public.visitor_employee_reporting_settings;
create policy "visitor_employee_reporting_settings_insert"
on public.visitor_employee_reporting_settings for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_reporting_settings_update" on public.visitor_employee_reporting_settings;
create policy "visitor_employee_reporting_settings_update"
on public.visitor_employee_reporting_settings for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update on public.visitor_employee_reporting_settings to authenticated;

notify pgrst, 'reload schema';
