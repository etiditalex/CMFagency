-- Free registration: optional per-event, no payment, invite email + QR
-- -----------------------------------------------------------------------------
-- 1) fusion_events: add free_registration (only some events use free reg).
-- 2) event_attendees: support free registrations (no transaction_id), add
--    event_id, event_slug, checked_in_at for gate scan.
-- Apply after patch_40.
-- -----------------------------------------------------------------------------

-- Events can be "free registration only" (no ticket sale)
alter table public.fusion_events
  add column if not exists free_registration boolean default false;

comment on column public.fusion_events.free_registration is 'If true, event uses free registration form only (no ticket/payment). Show Register (Free) and store in event_attendees.';

-- event_attendees: support rows without a transaction (free reg)
alter table public.event_attendees
  alter column transaction_id drop not null;

alter table public.event_attendees
  add column if not exists event_id uuid references public.fusion_events(id) on delete cascade,
  add column if not exists event_slug text,
  add column if not exists checked_in_at timestamptz;

create index if not exists event_attendees_event_id_idx on public.event_attendees(event_id);
create unique index if not exists event_attendees_reference_unique on public.event_attendees(reference);

-- Drop old unique so we can have multiple rows with null transaction_id (free reg)
drop index if exists public.event_attendees_tx_unique;

comment on column public.event_attendees.event_id is 'Set for free registrations (no transaction).';
comment on column public.event_attendees.checked_in_at is 'Set when gate scans this registration.';
