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

create or replace function public.increment_site_page_views()
returns bigint
language plpgsql
security definer
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

revoke all on function public.increment_site_page_views() from public;
grant execute on function public.increment_site_page_views() to service_role;

comment on table public.site_page_views is
  'Single-row counter of cumulative public site page views.';
