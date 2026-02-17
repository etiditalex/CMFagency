-- Fusion Xpress: Events management for upcoming, past, and all events pages
-- -----------------------------------------------------------------------------
-- Allows portal members to add/manage events displayed on /events,
-- /events/upcoming, and /events/past. Status (upcoming vs past) is derived from event_date.
--
-- Apply in Supabase SQL editor.
--
-- Portal: Add "events" to features array for clients who should manage events.
-- Admins/managers see Events by default.
-- -----------------------------------------------------------------------------

create table if not exists public.fusion_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  full_description text,
  event_date date not null,
  end_date date,
  location text,
  time text,
  image_url text,
  default_image_url text,
  category text,
  venue text,
  hosted_by text,
  gallery jsonb default '[]',
  ticket_campaign_slug text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint fusion_events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fusion_events_slug_uniq unique (slug)
);

create index if not exists fusion_events_event_date_idx on public.fusion_events(event_date);
create index if not exists fusion_events_created_by_idx on public.fusion_events(created_by);

alter table public.fusion_events enable row level security;

-- Public read: anyone can view events (for /events, /events/upcoming, /events/past)
drop policy if exists "fusion_events_public_read" on public.fusion_events;
create policy "fusion_events_public_read"
on public.fusion_events for select
using (true);

-- Portal members (admins/managers/clients with events feature) can insert
drop policy if exists "fusion_events_portal_insert" on public.fusion_events;
create policy "fusion_events_portal_insert"
on public.fusion_events for insert
with check (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

-- Portal members can update their own events; admins/managers can update any
drop policy if exists "fusion_events_portal_update" on public.fusion_events;
create policy "fusion_events_portal_update"
on public.fusion_events for update
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
)
with check (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

-- Portal members can delete
drop policy if exists "fusion_events_portal_delete" on public.fusion_events;
create policy "fusion_events_portal_delete"
on public.fusion_events for delete
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

grant select on table public.fusion_events to anon, authenticated;
grant insert, update, delete on table public.fusion_events to authenticated;

-- Trigger to keep updated_at current (set_updated_at from ticketing_voting_mvp.sql)
drop trigger if exists set_fusion_events_updated_at on public.fusion_events;
create trigger set_fusion_events_updated_at
before update on public.fusion_events
for each row execute function public.set_updated_at();
