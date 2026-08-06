-- Fusion Xpress: global switch for public vote total visibility
-- -----------------------------------------------------------------------------
-- Extends the existing singleton settings row (id = 1) from patch 62.
-- When `show_vote_totals` is false, public voting pages/APIs stop exposing tallies
-- and stop ranking contestants by votes. Voting itself is unaffected, and the
-- Fusion Xpress dashboard keeps showing full totals for internal reporting.
-- Apply in Supabase SQL editor after prior patches.
-- -----------------------------------------------------------------------------

alter table public.fusion_voting_schedule
  add column if not exists show_vote_totals boolean not null default true;

comment on column public.fusion_voting_schedule.show_vote_totals is
  'When false, public voting pages and public vote APIs hide per-contestant tallies and vote-based ranking.';

update public.fusion_voting_schedule
set show_vote_totals = true
where id = 1 and show_vote_totals is null;

do $$ begin raise notice 'fusion_voting_schedule.show_vote_totals ready.'; end $$;
