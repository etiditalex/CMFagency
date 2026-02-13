-- CMF Agency - Ticketing/Voting MVP patch 10 (Remove VAT)
-- -----------------------------------------------------------------------------
-- Removes VAT from transactions. Amount = quantity * unit_amount (no VAT).
--
-- Run after ticketing_voting_mvp_patch_09_inquiries.sql (or any prior patch).
-- Safe to run if patch_08 was never applied.
-- -----------------------------------------------------------------------------

-- Drop VAT-based constraint if it exists
alter table public.transactions
drop constraint if exists transactions_amount_vat_check;

-- Restore original amount constraint: amount = quantity * unit_amount
alter table public.transactions
drop constraint if exists transactions_amount_check;

alter table public.transactions
add constraint transactions_amount_check
check (amount = quantity * unit_amount);

-- Drop vat_amount column if it exists
alter table public.transactions
drop column if exists vat_amount;
