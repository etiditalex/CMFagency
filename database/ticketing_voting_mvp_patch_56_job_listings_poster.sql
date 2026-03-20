-- Optional advert poster for job board cards (URL or data URL from Fusion upload).
-- Run in Supabase SQL editor after patch_55.

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

COMMENT ON COLUMN public.job_listings.poster_url IS
  'Optional image for job card (https URL or data:image/...;base64,... from dashboard upload).';
