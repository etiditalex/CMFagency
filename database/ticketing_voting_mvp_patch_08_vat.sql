-- CMF Agency - Ticketing/Voting MVP patch 08 (16% VAT)
-- -----------------------------------------------------------------------------
-- Adds 16% VAT to all payments. Amount charged = subtotal + VAT.
--
-- Run after ticketing_voting_mvp.sql and prior patches.
-- -----------------------------------------------------------------------------

-- Add vat_amount column (in minor units, e.g. KES cents)
alter table public.transactions
add column if not exists vat_amount integer not null default 0
check (vat_amount >= 0);

comment on column public.transactions.vat_amount is 'VAT amount in minor units (16% of subtotal). amount = (quantity * unit_amount) + vat_amount.';

-- Drop the strict amount constraint (amount = quantity * unit_amount)
-- PostgreSQL names inline check constraints as {table}_{column}_check
alter table public.transactions
drop constraint if exists transactions_amount_check;

-- Drop new constraint if already applied (idempotent - safe to run patch twice)
alter table public.transactions
drop constraint if exists transactions_amount_vat_check;

-- Add new constraint: amount = subtotal + vat_amount
alter table public.transactions
add constraint transactions_amount_vat_check
check (amount = (quantity * unit_amount) + vat_amount);
