-- CMF Agency - Link-Based Ticketing & Voting MVP (Supabase Postgres)
-- -----------------------------------------------------------------------------
-- Assumptions (MVP, can evolve later):
-- - "Campaigns" can be either ticket sales or voting.
-- - Public users do NOT need login to view /pay/[slug] and to start a payment.
-- - Payment is ONLY confirmed by a webhook (Supabase Edge Function) using the
--   service role key (bypasses RLS) after verifying the provider signature.
-- - Idempotency: fulfillment is guarded by `transactions.fulfilled_at` so a
--   transaction is never counted twice even if webhook retries.
-- - Voting: one contestant per transaction (simplest MVP UX); votes counted as
--   `quantity` for that contestant. (If you later need split voting, add a
--   `transaction_vote_allocations` table.)
--
-- How to apply:
-- - Paste into Supabase SQL editor and run.
-- - This file is intentionally standalone (no Supabase CLI migrations required).
-- -----------------------------------------------------------------------------

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.campaign_type as enum ('ticket', 'vote');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_status as enum ('pending', 'success', 'failed', 'abandoned');
exception
  when duplicate_object then null;
end $$;

-- Tables
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  type public.campaign_type not null,

  -- Public shareable slug used by /pay/[slug]
  slug text not null unique,
  title text not null,
  description text,

  -- Money stored in minor units (e.g. KES cents, NGN kobo)
  currency text not null default 'KES',
  unit_amount integer not null check (unit_amount > 0),
  max_per_txn integer not null default 10 check (max_per_txn > 0 and max_per_txn <= 1000),

  -- Campaign controls
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,

  -- Ownership (admin / dashboard)
  created_by uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_slug_format_chk
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists campaigns_created_by_idx on public.campaigns(created_by);
create index if not exists campaigns_is_active_idx on public.campaigns(is_active);

-- Keep campaigns.updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create table if not exists public.contestants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,

  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  constraint contestants_name_per_campaign_uniq unique (campaign_id, name)
);

create index if not exists contestants_campaign_id_idx on public.contestants(campaign_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  campaign_type public.campaign_type not null,

  -- Payment provider reference (e.g. Paystack reference)
  reference text not null unique,
  provider text not null default 'paystack',

  -- Buyer info (optional, but useful for receipts)
  email text,

  -- Quantity = number of tickets OR number of votes
  quantity integer not null check (quantity > 0 and quantity <= 1000),

  -- Snapshot price at time of initialization (avoids price-change ambiguity)
  currency text not null,
  unit_amount integer not null check (unit_amount > 0),
  amount integer not null check (amount = quantity * unit_amount),

  -- Voting MVP: one contestant per transaction
  contestant_id uuid references public.contestants(id) on delete restrict,

  status public.transaction_status not null default 'pending',
  paid_at timestamptz,
  verified_at timestamptz,

  -- Fulfillment guard (idempotency):
  -- If this is non-null, tickets/votes have already been issued/counted.
  fulfilled_at timestamptz,

  -- Raw provider payloads / extra info (non-sensitive only)
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint transactions_vote_requires_contestant_chk
    check (
      (campaign_type = 'vote' and contestant_id is not null)
      or
      (campaign_type = 'ticket' and contestant_id is null)
    )
);

create index if not exists transactions_campaign_id_idx on public.transactions(campaign_id);
create index if not exists transactions_status_idx on public.transactions(status);
create index if not exists transactions_created_at_idx on public.transactions(created_at);

-- Votes: one row per successful transaction (idempotent via unique transaction_id)
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  votes integer not null check (votes > 0 and votes <= 1000),
  created_at timestamptz not null default now(),

  constraint votes_transaction_uniq unique (transaction_id)
);

create index if not exists votes_campaign_id_idx on public.votes(campaign_id);
create index if not exists votes_contestant_id_idx on public.votes(contestant_id);

-- Tickets: one row per issued ticket code (optional MVP redemption later)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  code text not null unique,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists tickets_campaign_id_idx on public.tickets(campaign_id);
create index if not exists tickets_transaction_id_idx on public.tickets(transaction_id);

-- Basic stats view for dashboard (reads from webhook-confirmed state only)
create or replace view public.campaign_stats as
select
  c.id as campaign_id,
  c.type as campaign_type,
  c.slug,
  c.title,
  c.created_by,
  -- Ticket revenue is sum of successful transaction amounts
  coalesce(sum(case when t.status = 'success' then t.amount end), 0) as total_amount,
  -- Votes are counted from votes table (idempotent by transaction_id)
  coalesce(sum(v.votes), 0) as total_votes,
  coalesce(count(distinct case when t.status = 'success' then t.id end), 0) as successful_transactions
from public.campaigns c
left join public.transactions t on t.campaign_id = c.id
left join public.votes v on v.campaign_id = c.id
group by c.id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.campaigns enable row level security;
alter table public.contestants enable row level security;
alter table public.transactions enable row level security;
alter table public.votes enable row level security;
alter table public.tickets enable row level security;

-- campaigns
drop policy if exists "campaigns_public_read_active" on public.campaigns;
create policy "campaigns_public_read_active"
on public.campaigns
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or now() >= starts_at)
  and (ends_at is null or now() <= ends_at)
);

drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- contestants
drop policy if exists "contestants_public_read_active_campaign" on public.contestants;
create policy "contestants_public_read_active_campaign"
on public.contestants
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = contestants.campaign_id
      and c.is_active = true
      and (c.starts_at is null or now() >= c.starts_at)
      and (c.ends_at is null or now() <= c.ends_at)
  )
);

drop policy if exists "contestants_owner_write" on public.contestants;
create policy "contestants_owner_write"
on public.contestants
for insert
to authenticated
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

drop policy if exists "contestants_owner_update" on public.contestants;
create policy "contestants_owner_update"
on public.contestants
for update
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

drop policy if exists "contestants_owner_delete" on public.contestants;
create policy "contestants_owner_delete"
on public.contestants
for delete
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

-- transactions
-- Public users should be able to INSERT a pending transaction (created by the server action
-- using the anon key), but they should NOT be able to confirm success.
drop policy if exists "transactions_public_insert_pending" on public.transactions;
create policy "transactions_public_insert_pending"
on public.transactions
for insert
to anon, authenticated
with check (
  status = 'pending'
  and verified_at is null
  and fulfilled_at is null
  and exists (
    select 1
    from public.campaigns c
    where c.id = transactions.campaign_id
      and c.is_active = true
      and c.type = transactions.campaign_type
      and c.currency = transactions.currency
      and c.unit_amount = transactions.unit_amount
      and transactions.quantity <= c.max_per_txn
      and (c.starts_at is null or now() >= c.starts_at)
      and (c.ends_at is null or now() <= c.ends_at)
  )
);

-- Admin can read their campaign transactions (dashboard stats)
drop policy if exists "transactions_owner_read" on public.transactions;
create policy "transactions_owner_read"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = transactions.campaign_id and c.created_by = auth.uid()
  )
);

-- votes + tickets are only readable by campaign owner (admin dashboard).
-- Inserts are performed by webhook with service role (bypasses RLS).
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes
for select
to authenticated
using (exists (select 1 from public.campaigns c where c.id = votes.campaign_id and c.created_by = auth.uid()));

drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets
for select
to authenticated
using (exists (select 1 from public.campaigns c where c.id = tickets.campaign_id and c.created_by = auth.uid()));

-- No direct writes to votes/tickets from client roles.
revoke insert, update, delete on public.votes from anon, authenticated;
revoke insert, update, delete on public.tickets from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Grants (required alongside RLS in Supabase)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- campaigns: public read, authenticated write (RLS still applies)
grant select on table public.campaigns to anon, authenticated;
grant insert, update, delete on table public.campaigns to authenticated;

-- contestants: public read, authenticated write (RLS still applies)
grant select on table public.contestants to anon, authenticated;
grant insert, update, delete on table public.contestants to authenticated;

-- transactions: allow anon/auth to insert pending transactions; dashboard reads via authenticated
grant insert on table public.transactions to anon, authenticated;
grant select on table public.transactions to authenticated;

-- votes/tickets: readable by authenticated (campaign owner via RLS)
grant select on table public.votes to authenticated;
grant select on table public.tickets to authenticated;

-- stats view: authenticated only (campaign owner via created_by in view)
grant select on table public.campaign_stats to authenticated;

