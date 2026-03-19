-- Fusion Xpress managed pages: optional hero background image for services pages.

alter table public.fusion_managed_pages
  add column if not exists background_image_url text;

comment on column public.fusion_managed_pages.background_image_url is
  'Optional hero background image for services pages (stored as data URL).';

