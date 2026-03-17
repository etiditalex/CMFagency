-- Document optional inclusions per tier in ticket_tiers JSONB.
-- Each tier object may include: "inclusions": ["Cocktail & Water", "2 bottles Soda", ...]
-- Apply after patch_42.
-- -----------------------------------------------------------------------------

comment on column public.fusion_events.ticket_tiers is 'Optional array of ticket tiers: [{ "id": "regular", "label": "Regular", "slug": "campaign-slug", "unit_amount_kes": 500, "inclusions": ["Cocktail", "Water"] }, ...]. inclusions (optional) lists perks shown on the ticket modal.';
