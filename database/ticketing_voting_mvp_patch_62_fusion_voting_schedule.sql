-- Fusion Xpress: global voting window (public voting pages stay locked until this instant)
-- -----------------------------------------------------------------------------
-- Single-row settings table. Admins/managers update via dashboard API (service role).
-- Public read for anon (campaign pages). Default: 1 April 2026 00:00 East Africa Time.
-- Apply in Supabase SQL editor after prior patches.
-- -----------------------------------------------------------------------------

create table if not exists public.fusion_voting_schedule (
  id smallint primary key default 1 constraint fusion_voting_schedule_singleton check (id = 1),
  voting_starts_at timestamptz not null default '2026-04-01 00:00:00+03',
  updated_at timestamptz not null default now()
);

comment on table public.fusion_voting_schedule is
  'Global instant when paid voting campaign pages unlock (Africa/Nairobi midnight on scheduled date by default).';

insert into public.fusion_voting_schedule (id, voting_starts_at)
values (1, '2026-04-01 00:00:00+03'::timestamptz)
on conflict (id) do nothing;

alter table public.fusion_voting_schedule enable row level security;

drop policy if exists "fusion_voting_schedule_select_public" on public.fusion_voting_schedule;
create policy "fusion_voting_schedule_select_public"
  on public.fusion_voting_schedule
  for select
  to anon, authenticated
  using (true);

grant select on table public.fusion_voting_schedule to anon, authenticated;

do $$ begin raise notice 'fusion_voting_schedule ready (id=1).'; end $$;
