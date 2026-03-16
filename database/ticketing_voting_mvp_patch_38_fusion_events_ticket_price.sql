-- Fusion Xpress Events: Add ticket price (KES) for regulated events
-- -----------------------------------------------------------------------------
-- Adds an optional numeric price field so organisers can set entrance/ticket
-- amounts (e.g. 12,000 KES for weddings or private events).
-- Apply in Supabase SQL editor after patch_18.
-- -----------------------------------------------------------------------------

alter table public.fusion_events
  add column if not exists ticket_price_kes numeric;

comment on column public.fusion_events.ticket_price_kes is 'Optional ticket/entrance price in Kenyan Shillings for this event.';

