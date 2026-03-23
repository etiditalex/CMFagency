-- Aggregated remote jobs from third-party APIs (Remote OK, Remotive, Jobicy, Adzuna).
-- Sync via POST/GET /api/internal/job-aggregate/sync (secured with CRON_SECRET on Vercel cron).
-- Public read merges with employer job_listings on /jobs.

CREATE TABLE IF NOT EXISTS public.aggregated_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL
    CHECK (source IN ('remoteok', 'remotive', 'jobicy', 'adzuna')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN (
      'full_time', 'part_time', 'contract', 'internship', 'attachment'
    )),
  salary_text TEXT,
  summary TEXT,
  description TEXT NOT NULL DEFAULT '',
  apply_url TEXT NOT NULL,
  company_logo_url TEXT,
  industry TEXT,
  seniority TEXT,
  posted_at TIMESTAMPTZ,
  search_tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(company_name, '')), 'B')
    || setweight(
      to_tsvector(
        'english',
        left(
          coalesce(summary, '') || ' ' || coalesce(description, ''),
          100000
        )
      ),
      'C'
    )
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_aggregated_jobs_posted_at
  ON public.aggregated_jobs (posted_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_aggregated_jobs_search_tsv
  ON public.aggregated_jobs USING GIN (search_tsv);

ALTER TABLE public.aggregated_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aggregated_jobs_public_read" ON public.aggregated_jobs;
CREATE POLICY "aggregated_jobs_public_read"
  ON public.aggregated_jobs
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.aggregated_jobs IS
  'Jobs ingested from Remote OK, Remotive, Jobicy, Adzuna; respect each provider terms (attribution + link to apply).';

DROP TRIGGER IF EXISTS set_aggregated_jobs_updated_at ON public.aggregated_jobs;
CREATE TRIGGER set_aggregated_jobs_updated_at
  BEFORE UPDATE ON public.aggregated_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.aggregated_jobs TO anon, authenticated;
