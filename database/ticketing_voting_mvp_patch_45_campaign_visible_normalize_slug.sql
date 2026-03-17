-- Fix client dashboard showing 0 stats: normalize slugs when matching event to campaign.
-- Tier slugs in ticket_tiers may be stored as "Old is Gold - Regular" while campaign.slug is "old-is-gold-regular".
-- Apply after patch_44.
-- -----------------------------------------------------------------------------

-- Normalize slug for comparison (matches app normalizeSlug: lower, hyphens, no leading/trailing hyphens)
create or replace function public.normalize_slug(s text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(s, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- Recreate campaign_visible_by_event_owner to use normalized slug matching
create or replace function public.campaign_visible_by_event_owner(c public.campaigns)
returns boolean
language sql
stable
security invoker
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
