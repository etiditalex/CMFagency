-- Fusion Xpress — Admin-granted subscription extensions (Patch 09)
-- Run after visitor_management_patch_04_subscription_payments.sql
-- -----------------------------------------------------------------------------

alter table public.visitor_management_subscriptions
  add column if not exists admin_extension_active boolean not null default false,
  add column if not exists admin_extension_ends_at timestamptz,
  add column if not exists admin_extension_plan text
    check (admin_extension_plan is null or admin_extension_plan in ('enterprise')),
  add column if not exists admin_extension_note text,
  add column if not exists admin_extension_granted_by uuid references auth.users (id) on delete set null,
  add column if not exists admin_extension_granted_at timestamptz;

comment on column public.visitor_management_subscriptions.admin_extension_active is
  'When true and admin_extension_ends_at is in the future, owner gets complimentary plan access (dashboard-managed).';
comment on column public.visitor_management_subscriptions.admin_extension_plan is
  'Complimentary plan tier; enterprise includes Professional + Real Estate features.';

notify pgrst, 'reload schema';
