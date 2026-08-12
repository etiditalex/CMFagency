-- CMFA: add Guests designation to the registration role dropdown.
-- Apply in Supabase SQL editor after patch_81_cmfa_kpc_students.

alter table public.cmfa_registrations
  drop constraint if exists cmfa_registrations_designation_check;

alter table public.cmfa_registrations
  add constraint cmfa_registrations_designation_check
  check (
    designation in (
      'cmf_executive',
      'high_fashion_model',
      'award_contestant',
      'sponsor_partner',
      'entertainment',
      'kpc_student',
      'guest'
    )
  );
