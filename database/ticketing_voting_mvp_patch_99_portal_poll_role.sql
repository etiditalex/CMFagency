-- Poll accounts: people who sign up from the public poll pages.
-- They can open Fusion Xpress and see only the Poll page.
-- Run in the Supabase SQL editor.

ALTER TABLE public.portal_members DROP CONSTRAINT IF EXISTS portal_members_role_check;
ALTER TABLE public.portal_members ADD CONSTRAINT portal_members_role_check
  CHECK (role IN ('client', 'admin', 'manager', 'employer', 'poll'));

COMMENT ON TABLE public.portal_members IS
  'Portal membership. Roles: admin (full), manager (add clients only), client (tier-based), employer (job board only), poll (Poll page only).';
