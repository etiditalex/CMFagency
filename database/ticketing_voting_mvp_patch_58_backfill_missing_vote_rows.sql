-- Backfill public.votes for successful vote payments that never got a row (webhook
-- failures, old votes<=1000 constraint, ignoreDuplicates quirks, etc.).
-- Does NOT change app code — run manually in Supabase SQL Editor when you want.
--
-- Prerequisites:
--   - Run patch 57 first if any row has quantity > 1000 (votes column check).
--
-- Workflow:
--   1) Run SECTION A (preview only) and review the list.
--   2) Optionally spot-check references in Dashboard / Paystack / M-Pesa.
--   3) Run SECTION B inside a transaction (BEGIN; ... COMMIT;) on staging or production.
-- -----------------------------------------------------------------------------

-- SECTION A — Preview: successful vote transactions with no votes row
-- (safe to run anytime; read-only)

SELECT
  t.id AS transaction_id,
  t.reference,
  t.provider,
  t.campaign_id,
  t.contestant_id,
  t.quantity AS votes_to_apply,
  t.amount,
  t.currency,
  t.created_at,
  t.fulfilled_at,
  (t.metadata ->> 'fulfillment_error') AS fulfillment_error
FROM public.transactions t
WHERE t.campaign_type = 'vote'
  AND t.status = 'success'
  AND t.contestant_id IS NOT NULL
  AND COALESCE((t.metadata ->> 'merchandise_cart')::boolean, false) = false
  AND t.quantity > 0
  AND t.quantity <= 1000000
  AND NOT EXISTS (SELECT 1 FROM public.votes v WHERE v.transaction_id = t.id)
ORDER BY t.created_at ASC;

-- SECTION B — Apply backfill (idempotent; safe to re-run)
-- On conflict updates counts if you re-run after a partial fix (source of truth = transaction).

BEGIN;

INSERT INTO public.votes (transaction_id, campaign_id, contestant_id, votes)
SELECT
  t.id,
  t.campaign_id,
  t.contestant_id,
  t.quantity
FROM public.transactions t
WHERE t.campaign_type = 'vote'
  AND t.status = 'success'
  AND t.contestant_id IS NOT NULL
  AND COALESCE((t.metadata ->> 'merchandise_cart')::boolean, false) = false
  AND t.quantity > 0
  AND t.quantity <= 1000000
  AND NOT EXISTS (SELECT 1 FROM public.votes v WHERE v.transaction_id = t.id)
ON CONFLICT (transaction_id) DO UPDATE SET
  campaign_id = EXCLUDED.campaign_id,
  contestant_id = EXCLUDED.contestant_id,
  votes = EXCLUDED.votes;

COMMIT;

-- Optional: if you prefer not to update existing vote rows on re-run, use instead of SECTION B:
--
-- INSERT INTO public.votes (transaction_id, campaign_id, contestant_id, votes)
-- SELECT t.id, t.campaign_id, t.contestant_id, t.quantity
-- FROM public.transactions t
-- WHERE ... same WHERE ...
-- ON CONFLICT (transaction_id) DO NOTHING;
