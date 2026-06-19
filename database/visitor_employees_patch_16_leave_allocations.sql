-- Fusion Xpress — Employee module: per-employee leave day allocations (Patch 16)
-- Run after visitor_employees_patch_11_leave.sql
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_leave_allocations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  leave_year int not null default extract(year from current_date),
  annual_days numeric(6, 1) not null default 21,
  sick_days numeric(6, 1) not null default 14,
  compassionate_days numeric(6, 1) not null default 5,
  unpaid_days numeric(6, 1),
  other_days numeric(6, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_employee_leave_allocations_year_valid check (leave_year >= 2000 and leave_year <= 2100),
  constraint visitor_employee_leave_allocations_days_non_negative check (
    annual_days >= 0
    and sick_days >= 0
    and compassionate_days >= 0
    and (unpaid_days is null or unpaid_days >= 0)
    and other_days >= 0
  ),
  constraint visitor_employee_leave_allocations_employee_year_unique unique (owner_id, employee_id, leave_year)
);

create index if not exists visitor_employee_leave_allocations_owner_year_idx
  on public.visitor_employee_leave_allocations (owner_id, leave_year);

comment on table public.visitor_employee_leave_allocations is
  'Annual leave day budgets per employee. Approved leave deducts from the matching leave type balance for the calendar year.';

alter table public.visitor_employee_leave_allocations enable row level security;

drop policy if exists "visitor_employee_leave_allocations_select" on public.visitor_employee_leave_allocations;
create policy "visitor_employee_leave_allocations_select"
on public.visitor_employee_leave_allocations for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_allocations_insert" on public.visitor_employee_leave_allocations;
create policy "visitor_employee_leave_allocations_insert"
on public.visitor_employee_leave_allocations for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_allocations_update" on public.visitor_employee_leave_allocations;
create policy "visitor_employee_leave_allocations_update"
on public.visitor_employee_leave_allocations for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_leave_allocations_delete" on public.visitor_employee_leave_allocations;
create policy "visitor_employee_leave_allocations_delete"
on public.visitor_employee_leave_allocations for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);
