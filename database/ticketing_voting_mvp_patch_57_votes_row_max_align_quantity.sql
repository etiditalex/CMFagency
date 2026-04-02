-- Align public.votes.votes with transactions.quantity (up to 1,000,000).
-- Without this, M-Pesa/Paystack can charge for >1000 votes but INSERT into votes
-- fails the legacy check (votes <= 1000), so dashboards show revenue but not votes.
-- Run in Supabase SQL editor after prior ticketing patches.
-- -----------------------------------------------------------------------------

-- Drop legacy inline CHECK (often named votes_votes_check) and any previous run of this patch.
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_votes_check;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_votes_quantity_check;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.votes'::regclass
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) LIKE '%votes <= 1000%'
        OR pg_get_constraintdef(c.oid) LIKE '%votes<=1000%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.votes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.votes
  ADD CONSTRAINT votes_votes_quantity_check CHECK (votes > 0 AND votes <= 1000000);

-- Optional backfill (inspect results in a transaction first): insert vote rows for successful
-- M-Pesa/Paystack payments that never received a row due to the old CHECK or silent upsert failure.
-- INSERT INTO public.votes (transaction_id, campaign_id, contestant_id, votes)
-- SELECT t.id, t.campaign_id, t.contestant_id, t.quantity
-- FROM public.transactions t
-- WHERE t.status = 'success'
--   AND t.campaign_type = 'vote'
--   AND t.contestant_id IS NOT NULL
--   AND t.quantity > 0
--   AND NOT EXISTS (SELECT 1 FROM public.votes v WHERE v.transaction_id = t.id)
-- ON CONFLICT (transaction_id) DO NOTHING;
