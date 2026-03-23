-- Industry and seniority taxonomy for job board filters (run in Supabase SQL editor after prior patches).

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS seniority TEXT;

COMMENT ON COLUMN public.job_listings.industry IS 'Slug from app job industry taxonomy (see lib/job-listing-taxonomy.ts).';
COMMENT ON COLUMN public.job_listings.seniority IS 'Slug: entry_basic | mid | senior.';
