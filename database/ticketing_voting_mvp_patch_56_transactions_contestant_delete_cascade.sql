-- Deleting a contestant: cascade-delete linked vote transactions (test checkouts, abandoned STK, etc.).
-- Without this, ON DELETE RESTRICT on transactions.contestant_id blocks removal and you see:
--   violates foreign key constraint "transactions_contestant_id_fkey"
--
-- Effect: removing a contestant also removes their rows in public.transactions where contestant_id
-- matched. Rows in public.votes for those transactions are removed via votes.transaction_id ON DELETE CASCADE.
--
-- Run in Supabase SQL Editor after ticketing_voting_mvp.sql (and prior patches).
-- Safe to run multiple times.

alter table public.transactions
  drop constraint if exists transactions_contestant_id_fkey;

alter table public.transactions
  add constraint transactions_contestant_id_fkey
  foreign key (contestant_id)
  references public.contestants(id)
  on delete cascade;

comment on constraint transactions_contestant_id_fkey on public.transactions is
  'Deleting a contestant removes linked vote transactions (e.g. test payments). Ticket rows keep contestant_id null.';
