-- Fusion Xpress — Employee module: auto member ID codes (Patch 05)
-- Run after patch 01 (and 03 if using member_type).
-- -----------------------------------------------------------------------------

create or replace function public.sync_visitor_employee_member_code()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  prefix text;
  suffix text;
begin
  if new.employee_code is not null and trim(new.employee_code) <> '' then
    new.employee_code := upper(trim(new.employee_code));
    return new;
  end if;
  prefix := case
    when coalesce(new.member_type, 'staff') = 'crm' then 'CRM'
    else 'STF'
  end;
  suffix := upper(substr(replace(new.id::text, '-', ''), 1, 6));
  new.employee_code := prefix || '-' || suffix;
  return new;
end;
$$;

drop trigger if exists visitor_employees_sync_member_code on public.visitor_employees;
create trigger visitor_employees_sync_member_code
before insert or update of employee_code on public.visitor_employees
for each row execute function public.sync_visitor_employee_member_code();

-- Backfill codes for existing rows
update public.visitor_employees
set employee_code = upper(trim(employee_code))
where employee_code is not null and employee_code <> upper(trim(employee_code));

update public.visitor_employees e
set employee_code = case
  when coalesce(e.member_type, 'staff') = 'crm' then 'CRM'
  else 'STF'
end || '-' || upper(substr(replace(e.id::text, '-', ''), 1, 6))
where e.employee_code is null or trim(e.employee_code) = '';

notify pgrst, 'reload schema';
