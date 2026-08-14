-- Site-wide page view counter for public marketing site.
-- Run in Supabase SQL Editor once.

create table if not exists public.site_page_views (
  id integer primary key default 1 check (id = 1),
  total_views bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_page_views (id, total_views)
values (1, 0)
on conflict (id) do nothing;

alter table public.site_page_views enable row level security;

revoke all on public.site_page_views from anon, authenticated;
grant select, update, insert on public.site_page_views to service_role;

-- SECURITY INVOKER: only service_role has table grants, so RPC stays
-- server-only without elevated DEFINER privileges (clears Advisor lints).
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

-- PUBLIC revoke alone is not enough: Supabase also grants EXECUTE to anon /
-- authenticated directly. Revoke all three, then grant service_role only.
revoke execute on function public.increment_site_page_views() from public;
revoke execute on function public.increment_site_page_views() from anon;
revoke execute on function public.increment_site_page_views() from authenticated;
grant execute on function public.increment_site_page_views() to service_role;

comment on table public.site_page_views is
  'Single-row counter of cumulative public site page views.';
