-- Gate ticket revocation: invalidate a paid ticket without deleting the transaction record.
-- Apply in Supabase SQL editor.

alter table public.transactions
add column if not exists revoked_at timestamptz;

comment on column public.transactions.revoked_at is 'When gate staff revoked this ticket. Revoked receipts are denied at scan.';

create index if not exists transactions_revoked_at_idx on public.transactions(revoked_at) where revoked_at is not null;
