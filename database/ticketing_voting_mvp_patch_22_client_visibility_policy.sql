-- CMF Agency - Client visibility policy documentation
-- -----------------------------------------------------------------------------
-- Policy: Clients added to Fusion Xpress must NOT see admin/agency transactions.
-- They only see their own campaigns and payments from those campaigns.
-- Until an agreement is signed and activities begin, clients should see no reports.
--
-- Enforcement:
-- 1. RLS: transactions_owner_read policy - clients see only transactions where
--    campaign.created_by = auth.uid(). Admin campaigns (created_by = admin) are hidden.
-- 2. App: Dashboard and Transactions pages filter campaigns by created_by = user.id
--    for non-admin users.
-- 3. Features: Don't enable "reports" for new clients until agreement is signed.
--    When creating users, leave reports/ticketing/voting unchecked by default.
--
-- Run after: ticketing_voting_mvp_patch_20_rls_performance.sql
-- -----------------------------------------------------------------------------

comment on table public.transactions is
  'Payment transactions. RLS: clients see only rows where campaign.created_by = auth.uid(). Admins see all.';
