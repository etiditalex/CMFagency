-- Private Storage bucket for job application files (ID, CV, etc.).
-- Run in Supabase SQL Editor. Admins download via signed URLs from the dashboard.
--
-- After this, Storage → Policies: ensure only service role / signed URLs can read objects.
-- Default private bucket + server-side createSignedUrl is typical.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('application-documents', 'application-documents', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Optional: allow authenticated uploads only from your API (service role bypasses RLS).
-- If uploads fail with RLS errors, add a policy for INSERT/SELECT for service role or use Dashboard → Storage policies.
