-- Fusion events is_live: sales open/closed only (page stays public).
-- Apply in Supabase SQL editor after patch_86.
-- Offline events remain readable on the public site; checkout/registration
-- is gated in the app when is_live is false.

comment on column public.fusion_events.is_live is
  'When true, ticket sales / free registration are open. When false, the public event page stays up but shows a closed message and checkout is disabled. Toggle from Fusion Xpress Events (e.g. flash sale).';

-- Public can read all events again (page must remain reachable when sales are off)
drop policy if exists "fusion_events_public_read" on public.fusion_events;
create policy "fusion_events_public_read"
on public.fusion_events for select
using (true);

-- Portal select remains for admin UI (harmless alongside public_read)
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
