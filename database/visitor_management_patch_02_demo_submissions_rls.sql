-- Fusion Xpress — Visitor Management (Patch 02)
-- Allow portal users with visitor_management to read public industry demo submissions.

drop policy if exists "visitor_demo_submissions_admin_select" on public.visitor_demo_submissions;
drop policy if exists "visitor_demo_submissions_portal_select" on public.visitor_demo_submissions;

create policy "visitor_demo_submissions_portal_select"
on public.visitor_demo_submissions for select to authenticated
using (
  public.is_admin()
  or public.portal_has_feature('visitor_management')
);
