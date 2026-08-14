-- CMFA: store complimentary ticket color chosen at gate approval (regular / VIP / VVIP).
-- Null on existing rows so already-sent tickets are unchanged.
-- Apply in Supabase SQL editor after patch_88_cmfa_guest_designation.

alter table public.cmfa_registrations
  add column if not exists ticket_tier text;

alter table public.cmfa_registrations
  drop constraint if exists cmfa_registrations_ticket_tier_check;

alter table public.cmfa_registrations
  add constraint cmfa_registrations_ticket_tier_check
  check (ticket_tier is null or ticket_tier in ('regular', 'vip', 'vvip'));

comment on column public.cmfa_registrations.ticket_tier is
  'Complimentary ticket color chosen when approving: regular (green), vip (blue), or vvip (gold). Null for registrations approved before this column; already-emailed tickets are not rewritten.';
