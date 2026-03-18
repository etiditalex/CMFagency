-- Free registration: optional party / guest count (e.g. renewal of vows + guests)
-- Helps planners estimate total headcount (registrant + people with them).
-- Apply after patch_46.

alter table public.fusion_events
  add column if not exists free_registration_ask_party_size boolean default false;

comment on column public.fusion_events.free_registration_ask_party_size is 'When true, free registration form asks how many people attend with the registrant (excludes the registrant).';

alter table public.event_attendees
  add column if not exists additional_guests integer not null default 0;

alter table public.event_attendees
  drop constraint if exists event_attendees_additional_guests_range;

alter table public.event_attendees
  add constraint event_attendees_additional_guests_range
  check (additional_guests >= 0 and additional_guests <= 100);

comment on column public.event_attendees.additional_guests is 'People attending with this registrant (not counting the registrant). Total party = 1 + additional_guests.';
