-- Fix Supabase advisor: "RLS Enabled No Policy" on backend-only tables.
-- Adds explicit policies FOR service_role only. Anon/authenticated have no matching policies → no row access.
-- Service role bypasses RLS in practice; policies document access and clear the linter.
-- Apply after patch_49 (or anytime these tables show "RLS enabled no policy").
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- public.applications (insert/list via API + service_role only)
-- -----------------------------------------------------------------------------
drop policy if exists "Service role can access all applications" on public.applications;
drop policy if exists "applications_service_role" on public.applications;

create policy "applications_service_role"
on public.applications
for all
to service_role
using (true)
with check (true);

revoke all on public.applications from anon, authenticated;
grant select, insert, update, delete on public.applications to service_role;

-- -----------------------------------------------------------------------------
-- public.event_attendees
-- -----------------------------------------------------------------------------
drop policy if exists "event_attendees_service_role" on public.event_attendees;

create policy "event_attendees_service_role"
on public.event_attendees
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete on public.event_attendees to service_role;

-- -----------------------------------------------------------------------------
-- public.portal_login_codes
-- -----------------------------------------------------------------------------
drop policy if exists "portal_login_codes_service_role" on public.portal_login_codes;

create policy "portal_login_codes_service_role"
on public.portal_login_codes
for all
to service_role
using (true)
with check (true);

-- -----------------------------------------------------------------------------
-- public.portal_user_totp
-- -----------------------------------------------------------------------------
drop policy if exists "portal_user_totp_service_role" on public.portal_user_totp;

create policy "portal_user_totp_service_role"
on public.portal_user_totp
for all
to service_role
using (true)
with check (true);
