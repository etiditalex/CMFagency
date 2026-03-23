-- Job board: annual paid membership (KES 500) for paid-role listings;
-- internship & attachment listings stay free to browse.
-- Run in Supabase SQL editor after prior patches.

-- ---------------------------------------------------------------------------
-- job_board_memberships: one row per auth user, renewed via M-Pesa callback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_board_memberships (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  valid_until TIMESTAMPTZ NOT NULL,
  last_transaction_id UUID REFERENCES public.transactions (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_board_memberships_valid_until
  ON public.job_board_memberships (valid_until DESC);

ALTER TABLE public.job_board_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_board_memberships_select_own" ON public.job_board_memberships;
CREATE POLICY "job_board_memberships_select_own"
  ON public.job_board_memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.job_board_memberships IS
  'Paid job-board access; extended by Daraja callback on successful KES 500 payment.';

-- ---------------------------------------------------------------------------
-- job_listings: published vacancies (Fusion Xpress admins/managers CRUD via API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  employment_type TEXT NOT NULL
    CHECK (employment_type IN (
      'full_time', 'part_time', 'contract', 'internship', 'attachment'
    )),
  salary_text TEXT,
  summary TEXT,
  poster_url TEXT,
  industry TEXT,
  seniority TEXT,
  description TEXT NOT NULL DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  benefits JSONB NOT NULL DEFAULT '[]'::JSONB,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  posted_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_listings_status_published
  ON public.job_listings (status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_job_listings_employment_type
  ON public.job_listings (employment_type);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_listings_public_read_published" ON public.job_listings;
CREATE POLICY "job_listings_public_read_published"
  ON public.job_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

COMMENT ON TABLE public.job_listings IS
  'Public job board; internship/attachment rows are readable without membership; other types require active job_board_memberships to view full detail (enforced in API).';

DROP TRIGGER IF EXISTS set_job_listings_updated_at ON public.job_listings;
CREATE TRIGGER set_job_listings_updated_at
  BEFORE UPDATE ON public.job_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.job_board_memberships TO authenticated;
GRANT SELECT ON public.job_listings TO anon, authenticated;
