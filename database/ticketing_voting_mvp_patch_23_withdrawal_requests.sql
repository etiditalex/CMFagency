-- CMF Agency - Wallet withdrawals (M-Pesa B2C)
-- -----------------------------------------------------------------------------
-- Enables clients to request M-Pesa withdrawals. Admin must approve before
-- B2C payout is executed. Wallet shows M-Pesa and Paystack balances separately.
--
-- Balance derivation (no new balance table):
--   M-Pesa = SUM(transactions.amount) WHERE provider='daraja' AND status='success'
--            minus SUM(withdrawal_requests.amount) WHERE status IN (completed,processing,approved)
--   Paystack = SUM(transactions.amount) WHERE provider='paystack' AND status='success'
--
-- Run after: ticketing_voting_mvp_patch_22_client_visibility_policy.sql
-- -----------------------------------------------------------------------------

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null references auth.users(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'KES',

  -- Recipient (M-Pesa phone for B2C)
  recipient_phone text not null,

  -- Provider: only daraja (M-Pesa B2C) for now
  provider text not null default 'daraja' check (provider = 'daraja'),

  -- Workflow: pending_admin -> admin approves -> processing -> completed | rejected
  status text not null default 'pending_admin'
    check (status in ('pending_admin', 'approved', 'processing', 'completed', 'rejected')),

  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,

  -- B2C callback data (conversation_id, mpesa_transaction_id, etc.)
  metadata jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_requests_created_by_idx on public.withdrawal_requests(created_by);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);
create index if not exists withdrawal_requests_created_at_idx on public.withdrawal_requests(created_at);

comment on table public.withdrawal_requests is 'M-Pesa B2C withdrawal requests. Admin must approve before payout is executed.';

-- RLS
alter table public.withdrawal_requests enable row level security;

-- Clients can read their own requests; admins read all
create policy "withdrawal_requests_read"
on public.withdrawal_requests for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid() and pm.role in ('admin', 'manager')
  )
);

-- Clients can insert pending_admin requests only
create policy "withdrawal_requests_insert"
on public.withdrawal_requests for insert to authenticated
with check (
  created_by = auth.uid()
  and status = 'pending_admin'
  and provider = 'daraja'
);

-- Only admins can update (approve/reject); service role bypasses
create policy "withdrawal_requests_update"
on public.withdrawal_requests for update to authenticated
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid() and pm.role = 'admin'
  )
);

-- Keep updated_at current
create or replace function public.set_withdrawal_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_withdrawal_requests_updated_at on public.withdrawal_requests;
create trigger set_withdrawal_requests_updated_at
before update on public.withdrawal_requests
for each row execute function public.set_withdrawal_updated_at();
