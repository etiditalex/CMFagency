-- Add image_url to campaigns for Fusion Xpress dashboard
-- -----------------------------------------------------------------------------
-- Allows attaching an uploaded image to campaigns (ticket/vote) for display on
-- the public payment page. Images are stored in the database as base64 data URLs
-- (data:image/xxx;base64,...) in image_url. Same format used for contestants.
--
-- Apply in Supabase SQL editor.
-- -----------------------------------------------------------------------------

alter table public.campaigns
add column if not exists image_url text;

comment on column public.campaigns.image_url is 'Optional image: stored as base64 data URL (data:image/xxx;base64,...) in DB.';
