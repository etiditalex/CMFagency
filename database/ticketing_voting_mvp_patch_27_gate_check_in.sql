-- Gate check-in: detect duplicate receipt/QR use at entry
-- -----------------------------------------------------------------------------
-- When gate staff scan a receipt/QR, we set checked_in_at. A second scan of the
-- same receipt is treated as duplicate (e.g. shared via WhatsApp) and denied.
--
-- Apply in Supabase SQL editor.
-- -----------------------------------------------------------------------------

alter table public.transactions
add column if not exists checked_in_at timestamptz;

comment on column public.transactions.checked_in_at is 'When this receipt/QR was first scanned at the gate. Null = not yet used; set on first scan to detect duplicates.';

create index if not exists transactions_checked_in_at_idx on public.transactions(checked_in_at) where checked_in_at is not null;
