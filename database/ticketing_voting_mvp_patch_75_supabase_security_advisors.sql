-- Supabase Security Advisor fixes (apply in SQL Editor)
-- -----------------------------------------------------------------------------
-- 1) v_visitor_2fa_status — SECURITY DEFINER view → security invoker
-- 2) KCM touch_* trigger functions — set immutable search_path
--
-- Auth — Leaked password protection (cannot be enabled via SQL):
--   Dashboard → Authentication → Attack Protection → enable "Leaked password protection"
--   (Check passwords against HaveIBeenPwned; availability depends on plan.)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1) v_visitor_2fa_status — run with caller privileges (respects table RLS)
-- -----------------------------------------------------------------------------
create or replace view public.v_visitor_2fa_status
with (security_invoker = on)
as
select
  vt.user_id,
  case when vt.verified_at is not null then true else false end as has_totp,
  pm.visitor_2fa_enabled,
  vt.verified_at,
  vt.created_at
from public.visitor_user_totp vt
left join public.portal_members pm on vt.user_id = pm.user_id;

-- -----------------------------------------------------------------------------
-- 2) KCM updated_at trigger helpers — fixed search_path
-- -----------------------------------------------------------------------------
create or replace function public.touch_kcm_memberships_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_kcm_member_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_kcm_member_wallet_transactions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
