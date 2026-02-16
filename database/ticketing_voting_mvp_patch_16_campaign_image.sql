-- Add image_url to campaigns for Fusion Xpress dashboard
-- -----------------------------------------------------------------------------
-- Allows attaching an uploaded image to campaigns (ticket/vote) for display on
-- the public payment page. Images are uploaded to Supabase Storage.
--
-- Apply in Supabase SQL editor.
--
-- Storage bucket: The upload API auto-creates bucket "campaign-images" on first
-- use. If it fails, create manually: Storage → New bucket → name: campaign-images,
-- Public: Yes.
-- -----------------------------------------------------------------------------

alter table public.campaigns
add column if not exists image_url text;

comment on column public.campaigns.image_url is 'Optional image URL (from Supabase Storage) for the campaign banner/thumbnail.';
