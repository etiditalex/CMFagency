-- Fusion Xpress: admin-configurable voting end date
-- -----------------------------------------------------------------------------
-- Extends the existing singleton settings row (id = 1) from patch 62, which so
-- far only stored when voting opens. The closing instant used to be hardcoded in
-- the public campaign page, so extending or shortening voting needed a redeploy.
-- Stored as the last voting day at 23:59:59 East Africa Time, matching how the
-- dashboard date picker sends it.
-- Apply in Supabase SQL editor after prior patches.
-- -----------------------------------------------------------------------------

alter table public.fusion_voting_schedule
  add column if not exists voting_ends_at timestamptz;

comment on column public.fusion_voting_schedule.voting_ends_at is
  'Instant the public "voting ends in" countdown reaches zero (last voting day at 23:59:59 Africa/Nairobi). Null falls back to the app default.';

-- Keeps the countdown on the value that was hardcoded before this patch.
update public.fusion_voting_schedule
set voting_ends_at = '2026-08-10 23:59:59+03'::timestamptz
where id = 1 and voting_ends_at is null;

do $$ begin raise notice 'fusion_voting_schedule.voting_ends_at ready.'; end $$;
