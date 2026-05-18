-- Fix: "function digest(text, unknown) does not exist" when running patch 04
-- Run this in Supabase SQL Editor if patch 04 failed on the gate token trigger.
-- Safe to re-run.

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

notify pgrst, 'reload schema';
