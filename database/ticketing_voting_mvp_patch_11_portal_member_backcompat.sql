-- CMF Agency - Ticketing/Voting MVP patch 11 (Portal member backward compat)
-- -----------------------------------------------------------------------------
-- Problem:
-- - Users in admin_users (legacy) but NOT in portal_members can access the
--   Fusion Xpress dashboard (PortalContext fallback), but campaign INSERT fails
--   with: "new row violates row-level security policy for table campaigns"
--
-- Cause:
-- - is_portal_member() only checks portal_members; RLS requires it for campaigns.
--
-- Fix:
-- - Extend is_portal_member() to also return true for users in admin_users,
--   matching the dashboard's backward-compat behavior.
-- -----------------------------------------------------------------------------

create or replace function public.is_portal_member()
returns boolean
language sql
stable
as $$
  select
    exists (select 1 from public.portal_members pm where pm.user_id = auth.uid())
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid());
$$;
