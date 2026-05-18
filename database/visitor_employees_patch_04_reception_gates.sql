-- Fusion Xpress — Employee module: Reception gate QR (Patch 04)
-- One scannable QR per team (staff / CRM) mounted at reception.
-- Run after visitor_employees_patch_01.sql (and 03 if using CRM teams).
-- -----------------------------------------------------------------------------
-- Uses md5() (built-in) for stable gate tokens — not pgcrypto digest().

create table if not exists public.visitor_employee_reception_gates (
  owner_id uuid not null references auth.users (id) on delete cascade,
  member_type text not null default 'staff'
    check (member_type in ('staff', 'crm')),
  gate_token text not null unique,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_type)
);

create index if not exists visitor_employee_reception_gates_token_idx
  on public.visitor_employee_reception_gates (gate_token);

comment on table public.visitor_employee_reception_gates is
  'Reception-mounted QR gates: one token per owner + team (staff or CRM).';

create or replace function public.sync_visitor_employee_gate_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.gate_token is null or trim(new.gate_token) = '' then
    new.gate_token := 'FX-EMP-GATE-' || upper(substr(
      md5(new.owner_id::text || ':' || new.member_type),
      1,
      20
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists visitor_employee_reception_gates_sync_token
  on public.visitor_employee_reception_gates;
create trigger visitor_employee_reception_gates_sync_token
before insert on public.visitor_employee_reception_gates
for each row execute function public.sync_visitor_employee_gate_token();

alter table public.visitor_employee_reception_gates enable row level security;

drop policy if exists "visitor_employee_reception_gates_select"
  on public.visitor_employee_reception_gates;
create policy "visitor_employee_reception_gates_select"
on public.visitor_employee_reception_gates for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_reception_gates_insert"
  on public.visitor_employee_reception_gates;
create policy "visitor_employee_reception_gates_insert"
on public.visitor_employee_reception_gates for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_employee_reception_gates_update"
  on public.visitor_employee_reception_gates;
create policy "visitor_employee_reception_gates_update"
on public.visitor_employee_reception_gates for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update on public.visitor_employee_reception_gates to authenticated;

notify pgrst, 'reload schema';
