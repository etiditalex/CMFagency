-- Document optional per-tier field people_per_package in fusion_events.ticket_tiers (jsonb).
-- Example: VVIP round table — one purchase covers 4 people; set people_per_package: 4 on that tier.
-- No schema change (jsonb); app reads/writes the key. Run optionally for documentation in Supabase.

comment on column public.fusion_events.ticket_tiers is
  'Optional array of ticket tiers: [{ "id": "regular", "label": "Regular", "slug": "campaign-slug", "unit_amount_kes": 500, "inclusions": ["..."], "people_per_package": 4 }, ...]. people_per_package (optional, integer >= 1, default 1): how many guests one purchase covers (e.g. round table for 4).';
