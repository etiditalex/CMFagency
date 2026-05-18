-- Fusion Xpress — Visitor Management: Employee attendance (Patch 01)
-- -----------------------------------------------------------------------------
-- Tables: visitor_employees, visitor_employee_attendance
-- Bundled with visitor_management feature (portal_members.features)
--
-- Apply in Supabase SQL Editor after visitor_management_patch_01.sql
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Staff / employees (manual onboarding, unique QR per member)
-- -----------------------------------------------------------------------------
create table if not exists public.visitor_employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  department text not null default '',
  job_title text not null default '',
  employee_code text,
  qr_code_token text unique,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  attendance_status text not null default 'out'
    check (attendance_status in ('out', 'in')),
  registered_device_id text,
  last_signed_in_at timestamptz,
  last_signed_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_employees_owner_code_unique unique (owner_id, employee_code)
);

create index if not exists visitor_employees_owner_created_idx
  on public.visitor_employees (owner_id, created_at desc);
create index if not exists visitor_employees_owner_status_idx
  on public.visitor_employees (owner_id, status);
create index if not exists visitor_employees_qr_token_idx
  on public.visitor_employees (qr_code_token) where qr_code_token is not null;

comment on table public.visitor_employees is
  'Staff members for Fusion Xpress Visitor Management employee attendance module.';
comment on column public.visitor_employees.qr_code_token is
  'Unique FX-EMP-* token encoded in staff QR passes.';
comment on column public.visitor_employees.registered_device_id is
  'First device fingerprint bound when the employee scans their pass (audit).';

-- -----------------------------------------------------------------------------
-- Sign-in / sign-out event log
-- -----------------------------------------------------------------------------
create table if not exists public.visitor_employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('sign_in', 'sign_out')),
  device_id text,
  device_label text,
  device_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visitor_employee_attendance_employee_idx
  on public.visitor_employee_attendance (employee_id, created_at desc);
create index if not exists visitor_employee_attendance_owner_idx
  on public.visitor_employee_attendance (owner_id, created_at desc);

comment on table public.visitor_employee_attendance is
  'Employee sign-in and sign-out events (QR scan or kiosk).';

-- -----------------------------------------------------------------------------
-- updated_at + QR token on insert
-- -----------------------------------------------------------------------------
drop trigger if exists set_visitor_employees_updated_at on public.visitor_employees;
create trigger set_visitor_employees_updated_at
before update on public.visitor_employees
for each row execute function public.set_updated_at();

create or replace function public.sync_visitor_employee_qr_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.qr_code_token is null then
    new.qr_code_token := 'FX-EMP-' || replace(new.id::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists visitor_employees_sync_qr_token on public.visitor_employees;
create trigger visitor_employees_sync_qr_token
before insert on public.visitor_employees
for each row execute function public.sync_visitor_employee_qr_token();

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.visitor_employees enable row level security;
alter table public.visitor_employee_attendance enable row level security;

drop policy if exists "visitor_employees_select" on public.visitor_employees;
create policy "visitor_employees_select"
on public.visitor_employees for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employees_insert" on public.visitor_employees;
create policy "visitor_employees_insert"
on public.visitor_employees for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employees_update" on public.visitor_employees;
create policy "visitor_employees_update"
on public.visitor_employees for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employees_delete" on public.visitor_employees;
create policy "visitor_employees_delete"
on public.visitor_employees for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_attendance_select" on public.visitor_employee_attendance;
create policy "visitor_employee_attendance_select"
on public.visitor_employee_attendance for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_attendance_insert" on public.visitor_employee_attendance;
create policy "visitor_employee_attendance_insert"
on public.visitor_employee_attendance for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update, delete on public.visitor_employees to authenticated;
grant select, insert on public.visitor_employee_attendance to authenticated;
