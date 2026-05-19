-- Fusion Xpress — Rename subscription plan "basic" → "professional" (Patch 07)
-- Run after visitor_management_patch_03_subscriptions.sql
-- -----------------------------------------------------------------------------

update public.visitor_management_subscriptions
set plan = 'professional', updated_at = now()
where plan = 'basic';

alter table public.visitor_management_subscriptions
  drop constraint if exists visitor_management_subscriptions_plan_check;

alter table public.visitor_management_subscriptions
  add constraint visitor_management_subscriptions_plan_check
  check (plan in ('trial', 'professional', 'enterprise'));

notify pgrst, 'reload schema';
