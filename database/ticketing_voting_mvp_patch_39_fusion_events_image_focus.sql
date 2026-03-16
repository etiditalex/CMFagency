-- Fusion Xpress Events: Image focus / object-position
-- -----------------------------------------------------------------------------
-- Adds an optional image_focus field so organisers can control how hero/card
-- images are cropped (e.g. center center, top center, bottom center).
-- Apply in Supabase SQL editor after patch_38.
-- -----------------------------------------------------------------------------

alter table public.fusion_events
  add column if not exists image_focus text;

comment on column public.fusion_events.image_focus is 'Optional image focal position for object-position (e.g. center center, top center, bottom center, center left, center right).';

