-- CMF Agency - Ticketing/Voting MVP patch 07 (Portal features)
-- -----------------------------------------------------------------------------
-- Goal: Store per-user feature flags so admins can tick which features each
-- client gets (Payouts, Coupons, Managers, Email) instead of relying only on tier.
--
-- Features: payouts | coupons | managers | email
-- - Admins/managers: always have all (no need to store; empty = all for them)
-- - Clients: explicit list of enabled features
--
-- Run after ticketing_voting_mvp_patch_06_manager_role.sql
-- -----------------------------------------------------------------------------

alter table public.portal_members
add column if not exists features jsonb not null default '[]';

comment on column public.portal_members.features is 'Enabled feature keys for clients: payouts, coupons, managers, email, create_campaign, ticketing, voting, reports. Admins/managers bypass and see all.';
