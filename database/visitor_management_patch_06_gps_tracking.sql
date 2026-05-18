-- Fusion Xpress — Workplace GPS for employee sign-in/out (Patch 06)
-- Run after visitor_management_patch_03_subscriptions.sql and employee patches.
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_management_org_locations (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_m integer not null default 150
    check (geofence_radius_m >= 25 and geofence_radius_m <= 2000),
  address_line_1 text not null default '',
  address_line_2 text not null default '',
  suburb text not null default '',
  state text not null default '',
  postcode text not null default '',
  country text not null default '',
  geocoded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visitor_management_org_locations is
  'Registered workplace coordinates for GPS-verified employee attendance.';

alter table public.visitor_management_org_locations enable row level security;

drop policy if exists "visitor_management_org_locations_select"
  on public.visitor_management_org_locations;
create policy "visitor_management_org_locations_select"
on public.visitor_management_org_locations for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_management_org_locations_insert"
  on public.visitor_management_org_locations;
create policy "visitor_management_org_locations_insert"
on public.visitor_management_org_locations for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_management_org_locations_update"
  on public.visitor_management_org_locations;
create policy "visitor_management_org_locations_update"
on public.visitor_management_org_locations for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update on public.visitor_management_org_locations to authenticated;

drop trigger if exists set_visitor_management_org_locations_updated_at
  on public.visitor_management_org_locations;
create trigger set_visitor_management_org_locations_updated_at
before update on public.visitor_management_org_locations
for each row execute function public.set_updated_at();

alter table public.visitor_employee_attendance
  add column if not exists scan_latitude double precision,
  add column if not exists scan_longitude double precision,
  add column if not exists gps_distance_m integer,
  add column if not exists gps_verified boolean not null default false;

comment on column public.visitor_employee_attendance.scan_latitude is
  'Device latitude at sign-in/out when GPS tracking is enabled.';
comment on column public.visitor_employee_attendance.gps_distance_m is
  'Distance in metres from registered workplace at time of scan.';

notify pgrst, 'reload schema';
