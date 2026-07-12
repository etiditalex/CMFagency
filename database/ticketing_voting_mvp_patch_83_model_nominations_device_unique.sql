-- Device tracking for model nominations: one device can nominate each person once.
-- Apply in Supabase SQL Editor after patch_82.
-- -----------------------------------------------------------------------------

alter table public.model_nominations
  add column if not exists device_id text;

alter table public.model_nominations
  add column if not exists device_fingerprint text;

alter table public.model_nominations
  add column if not exists nominee_name_normalized text;

comment on column public.model_nominations.device_id is
  'Persistent client device id (localStorage/cookie) used to block repeat nominations of the same person.';

comment on column public.model_nominations.device_fingerprint is
  'Server hash of IP + User-Agent for audit and secondary duplicate detection.';

comment on column public.model_nominations.nominee_name_normalized is
  'Lowercased, whitespace-normalized nominee name for uniqueness checks.';

-- Backfill normalized names for existing rows
update public.model_nominations
set nominee_name_normalized = lower(regexp_replace(trim(nominee_name), '\s+', ' ', 'g'))
where nominee_name_normalized is null
  and nominee_name is not null;

create index if not exists model_nominations_device_id_idx
  on public.model_nominations (device_id);

create index if not exists model_nominations_device_fingerprint_idx
  on public.model_nominations (device_fingerprint);

-- One device may nominate a given person (per category/event) only once
create unique index if not exists model_nominations_device_nominee_uniq
  on public.model_nominations (
    device_id,
    event_slug,
    category,
    nominee_name_normalized
  )
  where device_id is not null
    and nominee_name_normalized is not null;

-- Admins/managers can delete nominations from Fusion Xpress
drop policy if exists "model_nominations_admin_delete" on public.model_nominations;
create policy "model_nominations_admin_delete"
on public.model_nominations
for delete
to authenticated
using (public.is_admin());

grant delete on public.model_nominations to authenticated;
