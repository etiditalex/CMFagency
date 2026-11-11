-- Award calendar dates shown on /events and /2028-calendar.
-- Admins edit them from Fusion Xpress → Calendar.
-- Apply in the Supabase SQL editor after patch_24 (is_admin and set_updated_at). Safe to run more than once.

create table if not exists public.award_calendar_stops (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  host text not null,
  note text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint award_calendar_stops_date_uniq unique (event_date),
  constraint award_calendar_stops_host_len check (char_length(btrim(host)) between 1 and 160),
  constraint award_calendar_stops_note_len check (note is null or char_length(note) <= 500)
);

create index if not exists award_calendar_stops_published_date_idx
  on public.award_calendar_stops (published, event_date);

alter table public.award_calendar_stops enable row level security;

drop policy if exists "award_calendar_stops_public_read" on public.award_calendar_stops;
create policy "award_calendar_stops_public_read"
  on public.award_calendar_stops for select
  using (published = true);

drop policy if exists "award_calendar_stops_portal_write" on public.award_calendar_stops;
create policy "award_calendar_stops_portal_write"
  on public.award_calendar_stops for all
  to authenticated
  using (
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = (select auth.uid())
        and (
          pm.role in ('admin', 'manager')
          or (pm.role = 'client' and pm.features ? 'events')
        )
    )
  )
  with check (
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = (select auth.uid())
        and (
          pm.role in ('admin', 'manager')
          or (pm.role = 'client' and pm.features ? 'events')
        )
    )
  );

grant select on table public.award_calendar_stops to anon, authenticated;
grant insert, update, delete on table public.award_calendar_stops to authenticated;

drop trigger if exists set_award_calendar_stops_updated_at on public.award_calendar_stops;
create trigger set_award_calendar_stops_updated_at
  before update on public.award_calendar_stops
  for each row execute function public.set_updated_at();

insert into public.award_calendar_stops (event_date, host, published)
values
  ('2028-04-29', 'Coast — Kilifi', true),
  ('2028-05-27', 'North Eastern — Garissa', true),
  ('2028-06-24', 'Eastern — Embu', true),
  ('2028-07-29', 'Western — Kakamega', true),
  ('2028-08-26', 'Central — Nyeri', true),
  ('2028-09-30', 'Rift Valley — Nakuru', true),
  ('2028-10-28', 'Nairobi Metropolitan — Nairobi', true),
  ('2028-11-25', 'Nyanza — Kisumu', true)
on conflict (event_date) do nothing;

comment on table public.award_calendar_stops is
  'Host dates for the public award calendar. Published rows appear on /events and /2028-calendar.';

do $$ begin raise notice 'Award calendar stops ready.'; end $$;
