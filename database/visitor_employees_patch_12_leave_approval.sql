-- Fusion Xpress — Employee module: leave approval workflow (Patch 12)
-- Run after visitor_employees_patch_11_leave.sql if patch 11 was applied without status columns.
-- -----------------------------------------------------------------------------

alter table public.visitor_employee_leave
  add column if not exists status text not null default 'pending';

alter table public.visitor_employee_leave
  add column if not exists approved_at timestamptz;

alter table public.visitor_employee_leave
  add column if not exists rejected_at timestamptz;

alter table public.visitor_employee_leave
  add column if not exists notification_sent_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'visitor_employee_leave_status_valid'
  ) then
    alter table public.visitor_employee_leave
      add constraint visitor_employee_leave_status_valid
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists visitor_employee_leave_owner_status_idx
  on public.visitor_employee_leave (owner_id, status, start_date desc);

comment on column public.visitor_employee_leave.status is
  'pending = awaiting admin approval; approved = counts in register and triggers employee email; rejected = declined.';
