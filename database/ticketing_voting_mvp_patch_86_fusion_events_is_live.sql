-- Fusion Xpress events: public Live / Off toggle (e.g. flash sale tickets).
-- Apply in Supabase SQL editor.
-- When is_live is false, the event is hidden from public pages (RLS + app filters).
-- Dashboard portal members can still see and edit offline events.

alter table public.fusion_events
  add column if not exists is_live boolean not null default true;

comment on column public.fusion_events.is_live is
  'When true, event is visible on public upcoming/past/all event pages. Toggle from Fusion Xpress Events dashboard (e.g. turn flash sale on at start, off when it ends).';

create index if not exists fusion_events_is_live_idx on public.fusion_events (is_live);

-- Public (anon / anyone): only live events
drop policy if exists "fusion_events_public_read" on public.fusion_events;
create policy "fusion_events_public_read"
on public.fusion_events for select
using (is_live = true);

-- Portal members with Events access: see all rows (including offline) for admin UI
drop policy if exists "fusion_events_portal_select" on public.fusion_events;
create policy "fusion_events_portal_select"
on public.fusion_events for select
to authenticated
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);
