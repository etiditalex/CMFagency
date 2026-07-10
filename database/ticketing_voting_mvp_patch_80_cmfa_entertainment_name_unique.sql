-- CMFA: add Entertainment designation + prevent duplicate names (pending/approved).
-- Apply in Supabase SQL editor after patch_77_cmfa_email_unique.
-- Rejected registrations may re-apply with the same name.
-- -----------------------------------------------------------------------------

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
      'entertainment'
    )
  );

create unique index if not exists cmfa_registrations_event_name_active_uniq
  on public.cmfa_registrations (
    event_slug,
    lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
  )
  where status in ('pending', 'approved');

comment on index public.cmfa_registrations_event_name_active_uniq is
  'One active CMFA registration per name per event (pending or approved; case-insensitive, collapsed whitespace).';
