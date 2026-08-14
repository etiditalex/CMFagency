-- Fusion Xpress: close voting at midnight tonight and track results email
-- -----------------------------------------------------------------------------
-- Sets the global close instant to 15 Aug 2026 00:00:00 East Africa Time
-- (midnight at the end of 14 Aug 2026) and records when the official
-- winners + contestants PDFs were emailed to the admin.
-- Apply in Supabase SQL editor after patch 85.
-- -----------------------------------------------------------------------------

alter table public.fusion_voting_schedule
  add column if not exists results_emailed_at timestamptz;

comment on column public.fusion_voting_schedule.results_emailed_at is
  'When the official winners and contestants PDFs were emailed after voting closed. Null means not yet sent.';

-- Last votes counted until this instant. Public pages and payment APIs refuse votes at/after it.
update public.fusion_voting_schedule
set
  voting_ends_at = '2026-08-15 00:00:00+03'::timestamptz,
  updated_at = now()
where id = 1;

do $$ begin raise notice 'fusion_voting_schedule close set to 2026-08-15 00:00 EAT; results_emailed_at ready.'; end $$;
