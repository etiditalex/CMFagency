-- CMF Agency - Ticketing/Voting MVP patch 05 (Portal tiers)
-- -----------------------------------------------------------------------------
-- Goal: Clients see different dashboard features based on their subscription tier
-- (purchase amount). Admins always see all features.
--
-- Tiers: basic | pro | enterprise
-- - basic: Dashboard, Campaigns, New Campaign, Profile
-- - pro: basic + Payouts, Coupons, Managers, Email
-- - enterprise: all features (same as pro for clients; Users stays admin-only)
--
-- Run after ticketing_voting_mvp_patch_04_portal_members_rbac.sql
-- -----------------------------------------------------------------------------

-- Add tier column to portal_members
alter table public.portal_members
add column if not exists tier text not null default 'basic'
check (tier in ('basic','pro','enterprise'));

comment on column public.portal_members.tier is 'Client subscription tier; admins ignore tier and see all.';
