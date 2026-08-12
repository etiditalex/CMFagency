-- Fusion Xpress events: Live / Off toggle for sales (e.g. flash sale tickets).
-- Apply in Supabase SQL editor.
-- Prefer also applying patch_87: is_live gates checkout only; the public page stays up.
-- (Early drafts of this patch hid offline rows via RLS; patch_87 restores public read.)

alter table public.fusion_events
  add column if not exists is_live boolean not null default true;

comment on column public.fusion_events.is_live is
  'When true, ticket sales / free registration are open. When false, the public page stays up with a closed message and checkout is disabled.';

create index if not exists fusion_events_is_live_idx on public.fusion_events (is_live);

-- Public can read all events (page remains reachable when sales are off)
drop policy if exists "fusion_events_public_read" on public.fusion_events;
create policy "fusion_events_public_read"
on public.fusion_events for select
using (true);

-- Portal members with Events access: see all rows for admin UI
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
