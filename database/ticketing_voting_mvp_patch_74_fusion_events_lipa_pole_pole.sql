-- Fusion Xpress events: flag events that offer Lipa Pole Pole (installment) ticket payments.
-- Apply in Supabase SQL editor. Dashboard lists/edits this field; checkout wiring can use it later.

alter table public.fusion_events
  add column if not exists lipa_pole_pole boolean not null default false;

comment on column public.fusion_events.lipa_pole_pole is
  'When true, this event is marketed as offering Lipa Pole Pole (pay tickets in installments). Set from Fusion Xpress dashboard.';
