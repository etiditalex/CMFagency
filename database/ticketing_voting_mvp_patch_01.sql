-- CMF Agency - Ticketing/Voting MVP patch 01
-- -----------------------------------------------------------------------------
-- Adds an idempotent ticket-fulfillment table used by the payment webhook.
-- This avoids double-issuing tickets on webhook retries.
-- -----------------------------------------------------------------------------

create table if not exists public.ticket_issues (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  issued_at timestamptz not null default now(),

  constraint ticket_issues_transaction_uniq unique (transaction_id)
);

create index if not exists ticket_issues_campaign_id_idx on public.ticket_issues(campaign_id);
create index if not exists ticket_issues_transaction_id_idx on public.ticket_issues(transaction_id);

alter table public.ticket_issues enable row level security;

drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues
for select
to authenticated
using (exists (select 1 from public.campaigns c where c.id = ticket_issues.campaign_id and c.created_by = auth.uid()));

-- Webhook uses service role (bypasses RLS) for inserts.
revoke insert, update, delete on public.ticket_issues from anon, authenticated;

grant select on table public.ticket_issues to authenticated;

