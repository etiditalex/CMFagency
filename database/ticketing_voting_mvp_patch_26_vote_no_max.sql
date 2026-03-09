-- Allow unlimited votes per transaction (up to 1,000,000).
-- Vote campaigns: set max_per_txn = 1000000 so RLS (transactions_insert_pending)
-- accepts quantity up to 1M. Ticket campaigns keep existing max_per_txn (app caps at 10,000).
-- Run in Supabase SQL editor.
-- -----------------------------------------------------------------------------

update public.campaigns
set max_per_txn = 1000000
where type = 'vote'
  and (max_per_txn is null or max_per_txn < 1000000);
