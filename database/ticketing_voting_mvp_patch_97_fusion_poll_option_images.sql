-- Polling Fx: photo for each candidate or person on a poll.
-- Safe to run after patch 96, including when that patch already created the table.

alter table public.fusion_poll_options
  add column if not exists image_url text;

comment on column public.fusion_poll_options.image_url is 'Public photo URL for this candidate. Uploaded from Polling Fx.';
