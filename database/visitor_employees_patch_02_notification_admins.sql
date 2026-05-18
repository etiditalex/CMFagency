-- Fusion Xpress — Employee module: notification admins (Patch 02)
-- Run after visitor_employees_patch_01.sql
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_notification_admins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  notify_sign_in boolean not null default true,
  notify_sign_out boolean not null default false,
  created_at timestamptz not null default now(),
  constraint visitor_employee_notification_admins_owner_email unique (owner_id, email)
);

create index if not exists visitor_employee_notification_admins_owner_idx
  on public.visitor_employee_notification_admins (owner_id, created_at desc);

comment on table public.visitor_employee_notification_admins is
  'Extra organisation admins who receive employee attendance emails (besides account owner).';

alter table public.visitor_employee_notification_admins enable row level security;

drop policy if exists "visitor_employee_notification_admins_select" on public.visitor_employee_notification_admins;
create policy "visitor_employee_notification_admins_select"
on public.visitor_employee_notification_admins for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_notification_admins_insert" on public.visitor_employee_notification_admins;
create policy "visitor_employee_notification_admins_insert"
on public.visitor_employee_notification_admins for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_notification_admins_update" on public.visitor_employee_notification_admins;
create policy "visitor_employee_notification_admins_update"
on public.visitor_employee_notification_admins for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_notification_admins_delete" on public.visitor_employee_notification_admins;
create policy "visitor_employee_notification_admins_delete"
on public.visitor_employee_notification_admins for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update, delete on public.visitor_employee_notification_admins to authenticated;

-- Allow manual correction of attendance event timestamps from dashboard
grant update on public.visitor_employee_attendance to authenticated;

drop policy if exists "visitor_employee_attendance_update" on public.visitor_employee_attendance;
create policy "visitor_employee_attendance_update"
on public.visitor_employee_attendance for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

notify pgrst, 'reload schema';
