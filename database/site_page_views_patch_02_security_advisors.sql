-- Fix Supabase Security Advisor warnings for increment_site_page_views.
-- Run in Supabase SQL Editor once.
--
-- Why patch_01 was not enough:
--   REVOKE FROM PUBLIC does not remove Supabase's direct EXECUTE grants
--   on anon / authenticated. Those roles still keep EXECUTE, so Advisor
--   keeps flagging SECURITY DEFINER callability.
--
-- Auth — Leaked password protection (cannot be enabled via SQL):
--   Dashboard → Authentication → Attack Protection → enable
--   "Leaked password protection"

create or replace function public.increment_site_page_views()
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_total bigint;
begin
  insert into public.site_page_views (id, total_views)
  values (1, 1)
  on conflict (id) do update
    set total_views = public.site_page_views.total_views + 1,
        updated_at = now()
  returning total_views into new_total;

  return new_total;
end;
$$;

-- Strip default PUBLIC grant and Supabase role grants; keep service_role only.
revoke execute on function public.increment_site_page_views() from public;
revoke execute on function public.increment_site_page_views() from anon;
revoke execute on function public.increment_site_page_views() from authenticated;
grant execute on function public.increment_site_page_views() to service_role;

-- Optional: confirm privileges (expect only service_role / postgres / owner).
-- select
--   p.proname,
--   r.rolname,
--   has_function_privilege(r.oid, p.oid, 'execute') as can_execute
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- cross join pg_roles r
-- where n.nspname = 'public'
--   and p.proname = 'increment_site_page_views'
--   and r.rolname in ('anon', 'authenticated', 'service_role', 'public')
-- order by r.rolname;
