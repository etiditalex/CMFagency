-- Employer role: self-serve hiring accounts (job board only in dashboard). Run in Supabase SQL editor.

ALTER TABLE public.portal_members DROP CONSTRAINT IF EXISTS portal_members_role_check;
ALTER TABLE public.portal_members ADD CONSTRAINT portal_members_role_check
  CHECK (role IN ('client', 'admin', 'manager', 'employer'));

COMMENT ON TABLE public.portal_members IS
  'Portal membership. Roles: admin (full), manager (add clients only), client (tier-based), employer (post job listings only).';
