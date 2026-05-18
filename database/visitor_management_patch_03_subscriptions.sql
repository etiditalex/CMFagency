-- Fusion Xpress — Smart Visitor Management subscriptions (Patch 03)
-- Run after visitor_management_patch_01.sql
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_management_subscriptions (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'trial'
    check (plan in ('trial', 'basic', 'enterprise')),
  trial_ends_at timestamptz,
  subscribed_at timestamptz,
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visitor_management_subscriptions_plan_idx
  on public.visitor_management_subscriptions (plan);

comment on table public.visitor_management_subscriptions is
  'Smart Visitor Management plan per organisation (trial / basic / enterprise).';

drop trigger if exists set_visitor_management_subscriptions_updated_at
  on public.visitor_management_subscriptions;
create trigger set_visitor_management_subscriptions_updated_at
before update on public.visitor_management_subscriptions
for each row execute function public.set_updated_at();

alter table public.visitor_management_subscriptions enable row level security;

drop policy if exists "visitor_management_subscriptions_select"
  on public.visitor_management_subscriptions;
create policy "visitor_management_subscriptions_select"
on public.visitor_management_subscriptions for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_management_subscriptions_insert"
  on public.visitor_management_subscriptions;
create policy "visitor_management_subscriptions_insert"
on public.visitor_management_subscriptions for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_management_subscriptions_update"
  on public.visitor_management_subscriptions;
create policy "visitor_management_subscriptions_update"
on public.visitor_management_subscriptions for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update on public.visitor_management_subscriptions to authenticated;

notify pgrst, 'reload schema';
