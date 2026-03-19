-- Supabase Security Advisor fixes (apply in SQL Editor after patch_47)
-- -----------------------------------------------------------------------------
-- 1) Function search_path mutable → set search_path on helper functions.
-- 2) event_attendees RLS "always true" → remove public policies; app uses service role only.
--
-- Auth — Leaked password protection (cannot be enabled via SQL):
--   Dashboard → Authentication → Attack Protection → enable "Leaked password protection"
--   (wording may be "Check passwords against HaveIBeenPwned"; Pro+ on some plans.)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1) normalize_slug + campaign_visible_by_event_owner (immutable search_path)
-- -----------------------------------------------------------------------------
create or replace function public.normalize_slug(s text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(s, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.campaign_visible_by_event_owner(c public.campaigns)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.fusion_events e
    where e.created_by = auth.uid()
      and (
        (e.ticket_campaign_slug is not null and public.normalize_slug(e.ticket_campaign_slug) = public.normalize_slug(c.slug))
        or (
          e.ticket_tiers is not null
          and (
            select bool_or(public.normalize_slug(elem->>'slug') = public.normalize_slug(c.slug))
            from jsonb_array_elements(e.ticket_tiers) elem
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 2) event_attendees — no direct anon/authenticated access (APIs use service_role)
-- -----------------------------------------------------------------------------
drop policy if exists "event_attendees_public_insert" on public.event_attendees;
drop policy if exists "event_attendees_public_update" on public.event_attendees;
drop policy if exists "event_attendees_public_select" on public.event_attendees;

revoke insert, update, select, delete on table public.event_attendees from anon;
revoke insert, update, select, delete on table public.event_attendees from authenticated;

comment on table public.event_attendees is
  'RSVP / free-reg attendees. Mutations via service_role API routes only (register, invite, gate).';
