-- Fusion Xpress — Employee module: leave records (Patch 11)
-- Run after visitor_employees_patch_01.sql
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_leave (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type text not null default 'annual',
  status text not null default 'pending',
  notes text not null default '',
  approved_at timestamptz,
  rejected_at timestamptz,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_employee_leave_dates_valid check (end_date >= start_date),
  constraint visitor_employee_leave_status_valid check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists visitor_employee_leave_employee_idx
  on public.visitor_employee_leave (employee_id, start_date desc);

create index if not exists visitor_employee_leave_owner_range_idx
  on public.visitor_employee_leave (owner_id, start_date, end_date);

create index if not exists visitor_employee_leave_owner_status_idx
  on public.visitor_employee_leave (owner_id, status, start_date desc);

comment on table public.visitor_employee_leave is
  'Leave assigned by the business admin; only approved leave appears in the attendance register. Employees are notified by email when leave is approved.';

alter table public.visitor_employee_leave enable row level security;

drop policy if exists "visitor_employee_leave_select" on public.visitor_employee_leave;
create policy "visitor_employee_leave_select"
on public.visitor_employee_leave for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_insert" on public.visitor_employee_leave;
create policy "visitor_employee_leave_insert"
on public.visitor_employee_leave for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_update" on public.visitor_employee_leave;
create policy "visitor_employee_leave_update"
on public.visitor_employee_leave for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_delete" on public.visitor_employee_leave;
create policy "visitor_employee_leave_delete"
on public.visitor_employee_leave for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);
