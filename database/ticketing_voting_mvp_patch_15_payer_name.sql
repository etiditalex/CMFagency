-- Add payer_name to transactions for dashboard display
-- -----------------------------------------------------------------------------
-- After payment is processed, admins can see who paid in the Fusion Xpress dashboard.
-- payer_name is optional; when not set, dashboard falls back to email.
--
-- Apply in Supabase SQL editor.
-- -----------------------------------------------------------------------------

alter table public.transactions
add column if not exists payer_name text;

comment on column public.transactions.payer_name is 'Display name of the payer (e.g. "John Doe"). Used in dashboard.';
