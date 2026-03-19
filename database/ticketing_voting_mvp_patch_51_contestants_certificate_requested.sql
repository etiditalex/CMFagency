-- Certificate request tracking for dashboard notifications.
-- Run after: ticketing_voting_mvp_patch_37_contestants_certificate.sql

alter table public.contestants
  add column if not exists certificate_requested_at timestamptz;

comment on column public.contestants.certificate_requested_at is
  'When contestant requested/checked certificate status from the public form.';
