-- Fusion events: optional ticket tiers (e.g. Regular, VIP, VVIP) for banner/modal on upcoming page
-- When ticket_tiers is non-empty, event card opens tiered ticket modal instead of single campaign link.
-- Apply after patch_41.
-- -----------------------------------------------------------------------------

alter table public.fusion_events
  add column if not exists ticket_tiers jsonb default null;

comment on column public.fusion_events.ticket_tiers is 'Optional array of ticket tiers: [{ "id": "regular", "label": "Regular", "slug": "campaign-slug", "unit_amount_kes": 500 }, ...]. When set, upcoming event shows tiered ticket modal (CFMA-style).';
