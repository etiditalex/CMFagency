-- Certificate of participation: approval and download tracking for CMFA event contestants.
-- Run after: ticketing_voting_mvp_patch_36_contestants_one_email_per_category.sql

alter table public.contestants
  add column if not exists certificate_approved_at timestamptz,
  add column if not exists certificate_approved_by uuid,
  add column if not exists certificate_downloaded_at timestamptz;

comment on column public.contestants.certificate_approved_at is 'When admin approved this contestant to download the participation certificate.';
comment on column public.contestants.certificate_approved_by is 'Portal user (admin) who approved the certificate.';
comment on column public.contestants.certificate_downloaded_at is 'When the contestant last downloaded the certificate (e-sign PDF).';
