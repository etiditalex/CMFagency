-- Add image_url to campaigns for Fusion Xpress dashboard
-- -----------------------------------------------------------------------------
-- Allows attaching an image to campaigns (ticket/vote) for display on
-- the public payment page and in campaign cards.
--
-- Apply in Supabase SQL editor.
-- -----------------------------------------------------------------------------

alter table public.campaigns
add column if not exists image_url text;

comment on column public.campaigns.image_url is 'Optional image URL for the campaign (banner/thumbnail).';
