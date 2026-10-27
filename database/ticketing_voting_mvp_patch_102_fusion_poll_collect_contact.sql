-- Polls created on /poll can ask each voter for a name and email.
-- The public results page still shows only the tally.
-- Apply in the Supabase SQL editor after patch 101.

alter table public.fusion_polls
  add column if not exists collect_contact boolean not null default false;
