-- Prevent duplicate CMFA registrations (same event + email while pending or approved).
-- Apply in Supabase SQL editor after patch_76.
-- Rejected registrations may re-apply with the same email.
-- -----------------------------------------------------------------------------

create unique index if not exists cmfa_registrations_event_email_active_uniq
  on public.cmfa_registrations (event_slug, lower(email))
  where status in ('pending', 'approved');

comment on index public.cmfa_registrations_event_email_active_uniq is
  'One active CMFA registration per email per event (pending or approved).';
