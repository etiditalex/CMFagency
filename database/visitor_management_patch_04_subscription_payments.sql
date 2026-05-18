-- Fusion Xpress — subscription payment tracking (Patch 04)
-- Run after visitor_management_patch_03_subscriptions.sql
-- -----------------------------------------------------------------------------

alter table public.visitor_management_subscriptions
  add column if not exists current_period_ends_at timestamptz,
  add column if not exists last_payment_reference text,
  add column if not exists last_transaction_id uuid references public.transactions (id) on delete set null;

comment on column public.visitor_management_subscriptions.current_period_ends_at is
  'Paid plan access ends at this time; renewed on each successful payment.';

notify pgrst, 'reload schema';
