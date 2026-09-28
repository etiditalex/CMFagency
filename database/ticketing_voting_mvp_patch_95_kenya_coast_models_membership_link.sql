-- Link Kenya Coast Models forum attendance to KCM memberships.
-- Existing members are matched by the membership number emailed on approval.
-- People who are not members yet are inserted into kcm_memberships after they pay.

alter table public.kenya_coast_models_registrations
  add column if not exists membership_id uuid,
  add column if not exists membership_number text,
  add column if not exists experience text;

create index if not exists kenya_coast_models_registrations_membership_id_idx
  on public.kenya_coast_models_registrations (membership_id);

alter table public.kcm_memberships
  add column if not exists forum_registration_id uuid;

create unique index if not exists kcm_memberships_forum_registration_id_idx
  on public.kcm_memberships (forum_registration_id)
  where forum_registration_id is not null;
