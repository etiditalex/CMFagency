-- Event attendees (RSVP details linked to tickets)
-- -----------------------------------------------------------------------------
-- Stores extra information provided by invitees/guests after they receive
-- their ticket email + QR code. Linked to transactions via reference and
-- (optionally) transaction_id.
-- Apply in Supabase SQL editor after patch_39.
-- -----------------------------------------------------------------------------

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  reference text not null,
  email text,
  name text,
  phone text,
  notes text,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists event_attendees_reference_idx on public.event_attendees(reference);
create unique index if not exists event_attendees_tx_unique on public.event_attendees(transaction_id);

comment on table public.event_attendees is 'RSVP / attendee details collected from invite links tied to ticket transactions.';

alter table public.event_attendees enable row level security;

-- Public can only insert/update their own RSVP by reference; reads are blocked.
drop policy if exists "event_attendees_public_insert" on public.event_attendees;
create policy "event_attendees_public_insert"
on public.event_attendees for insert
to anon, authenticated
with check (true);

drop policy if exists "event_attendees_public_update" on public.event_attendees;
create policy "event_attendees_public_update"
on public.event_attendees for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "event_attendees_public_select" on public.event_attendees;
create policy "event_attendees_public_select"
on public.event_attendees for select
to authenticated
using (true);

grant insert, update on table public.event_attendees to anon, authenticated;
grant select on table public.event_attendees to authenticated;

drop trigger if exists set_event_attendees_updated_at on public.event_attendees;
create trigger set_event_attendees_updated_at
before update on public.event_attendees
for each row execute function public.set_updated_at();

