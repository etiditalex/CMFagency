-- Fusion Xpress Events: Add payment, document, map, and calendar action fields
-- -----------------------------------------------------------------------------
-- Adds columns for: payment link, downloadable document, map location URL.
-- Calendar links can be auto-generated from event_date + location + title.
-- Apply in Supabase SQL editor after patch_17.
-- -----------------------------------------------------------------------------

alter table public.fusion_events
  add column if not exists payment_link text,
  add column if not exists document_url text,
  add column if not exists document_label text,
  add column if not exists map_url text;

comment on column public.fusion_events.payment_link is 'External payment URL (e.g. M-Pesa, PayPal) - alternative to ticket_campaign_slug';
comment on column public.fusion_events.document_url is 'URL to downloadable document (PDF, etc.)';
comment on column public.fusion_events.document_label is 'Button label for document download, e.g. Download Proposal';
comment on column public.fusion_events.map_url is 'Google Maps URL or coordinates link for event location';
