-- KFCAA regional and county volunteer applications.
-- Public submits via the service-role API. Fusion Xpress admins can read rows and update status.
-- Apply in the Supabase SQL editor after is_admin() exists.

create table if not exists public.kfcaa_volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null,
  full_name text not null,
  phone text not null,
  whatsapp text not null,
  email text not null,
  town text not null,
  residence_county text not null,
  current_role text,
  role text not null check (role in ('regional', 'county')),
  region text,
  represent_county text,
  creative_areas text[] not null,
  why_apply text not null,
  community_experience text not null,
  how_promote text not null,
  accuracy_confirmed boolean not null,
  volunteer_acknowledged boolean not null,
  contact_agreed boolean not null,
  updates_committed boolean not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'shortlisted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint kfcaa_volunteer_area_chk check (
    (role = 'regional' and region is not null and represent_county is null)
    or (role = 'county' and represent_county is not null and region is not null)
  ),
  constraint kfcaa_volunteer_creative_areas_chk check (cardinality(creative_areas) >= 1)
);

create unique index if not exists kfcaa_volunteer_applications_code_idx
  on public.kfcaa_volunteer_applications (application_code);

create index if not exists kfcaa_volunteer_applications_created_at_idx
  on public.kfcaa_volunteer_applications (created_at desc);

comment on table public.kfcaa_volunteer_applications is
  'Volunteer applications for KFCAA regional and county representatives.';

alter table public.kfcaa_volunteer_applications enable row level security;

drop policy if exists "kfcaa_volunteer_applications_admin_select" on public.kfcaa_volunteer_applications;
create policy "kfcaa_volunteer_applications_admin_select"
on public.kfcaa_volunteer_applications
for select
to authenticated
using (public.is_admin());

drop policy if exists "kfcaa_volunteer_applications_admin_update" on public.kfcaa_volunteer_applications;
create policy "kfcaa_volunteer_applications_admin_update"
on public.kfcaa_volunteer_applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke insert, update, delete on public.kfcaa_volunteer_applications from anon, authenticated;
grant select on public.kfcaa_volunteer_applications to authenticated;
grant update (status) on public.kfcaa_volunteer_applications to authenticated;
grant select, insert, update, delete on public.kfcaa_volunteer_applications to service_role;
