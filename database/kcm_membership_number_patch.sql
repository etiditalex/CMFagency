-- Adds a membership number assigned on approval (Fusion Xpress dashboard).
-- Format: KCM/YYYY/NNN (e.g. KCM/2026/001)

alter table public.kcm_memberships
  add column if not exists membership_number text;

alter table public.kcm_memberships
  add column if not exists approved_at timestamptz;

create unique index if not exists idx_kcm_memberships_membership_number_unique
  on public.kcm_memberships (membership_number)
  where membership_number is not null and btrim(membership_number) <> '';

