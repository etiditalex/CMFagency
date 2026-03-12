-- Function Search Path security fix (Supabase)
-- Set search_path on functions to prevent search_path injection.
-- See: https://supabase.com/docs/guides/database/database-advisors#function-search-path-mutable
--
-- Leaked password protection (Auth): enable in Dashboard → Authentication → Settings.
-- It is only available on Pro plan and above.

-- -----------------------------------------------------------------------------
-- 1) public.is_portal_member
-- -----------------------------------------------------------------------------
create or replace function public.is_portal_member()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (select 1 from public.portal_members pm where pm.user_id = (select auth.uid()))
    or exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()));
$$;

-- -----------------------------------------------------------------------------
-- 2) public.is_admin
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = (select auth.uid()) and pm.role in ('admin','manager')
    )
    or exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
    );
$$;

-- -----------------------------------------------------------------------------
-- 3) public.set_withdrawal_updated_at (trigger)
-- -----------------------------------------------------------------------------
create or replace function public.set_withdrawal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
