-- CMF Agency - Ticketing/Voting MVP patch 06 (Manager role)
-- -----------------------------------------------------------------------------
-- Goal: Add "manager" role - limited admin who can add clients but NOT other admins.
--
-- Roles:
-- - admin: Full power (add clients, add managers, add other admins)
-- - manager: Limited admin (add clients only, cannot add admins or managers)
-- - client: Tier-based access
--
-- Run after ticketing_voting_mvp_patch_05_portal_tiers.sql
-- -----------------------------------------------------------------------------

-- Extend role check to include 'manager'
alter table public.portal_members drop constraint if exists portal_members_role_check;
alter table public.portal_members add constraint portal_members_role_check
  check (role in ('client','admin','manager'));

comment on table public.portal_members is 'Portal membership. Roles: admin (full), manager (add clients only), client (tier-based).';

-- Managers get same data access as admins (RLS); app enforces UI restrictions (can't add admins).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = auth.uid() and pm.role in ('admin','manager')
    )
    or exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    );
$$;
