-- CMFA: add KPC student flag so the registration flow can enforce the first-10 complimentary slots.
-- Apply in Supabase SQL editor after the existing CMFA patches.

alter table public.cmfa_registrations
  add column if not exists is_kpc_student boolean not null default false;

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
      'kpc_student'
    )
  );

create index if not exists cmfa_registrations_kpc_student_idx
  on public.cmfa_registrations (event_slug, is_kpc_student, status);

comment on column public.cmfa_registrations.is_kpc_student is
  'True when the registrant is a KPC student; first 10 such registrations are complimentary, later ones require a regular ticket.';
