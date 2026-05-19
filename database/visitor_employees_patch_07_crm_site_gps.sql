-- Fusion Xpress — Real estate CRM site / project GPS visits (Patch 07)
-- Run after visitor_employees_patch_03_real_estate_crm.sql
-- -----------------------------------------------------------------------------

-- Developments / project sites (optional catalogue; visits always store live GPS at sign-in)
create table if not exists public.visitor_crm_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address_line1 text,
  address_line2 text,
  suburb text,
  state text,
  postcode text,
  country text default 'Kenya',
  latitude double precision,
  longitude double precision,
  geofence_radius_m integer not null default 200,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visitor_crm_projects_owner_status_idx
  on public.visitor_crm_projects (owner_id, status);

comment on table public.visitor_crm_projects is
  'Real-estate project sites for CRM field visits (catalogue for check-in).';

-- One row per site visit: sign-in GPS, then sign-out GPS when leaving
create table if not exists public.visitor_crm_site_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  project_id uuid references public.visitor_crm_projects (id) on delete set null,
  project_name text not null,
  sign_in_at timestamptz not null default now(),
  sign_out_at timestamptz,
  sign_in_latitude double precision not null,
  sign_in_longitude double precision not null,
  sign_in_accuracy_m double precision,
  sign_out_latitude double precision,
  sign_out_longitude double precision,
  sign_out_accuracy_m double precision,
  device_id text,
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_crm_site_visits_coords_check check (
    sign_in_latitude between -90 and 90
    and sign_in_longitude between -180 and 180
  )
);

create index if not exists visitor_crm_site_visits_owner_sign_in_idx
  on public.visitor_crm_site_visits (owner_id, sign_in_at desc);

create index if not exists visitor_crm_site_visits_employee_open_idx
  on public.visitor_crm_site_visits (employee_id)
  where sign_out_at is null;

create index if not exists visitor_crm_site_visits_employee_completed_idx
  on public.visitor_crm_site_visits (employee_id, sign_out_at)
  where sign_out_at is not null;

comment on table public.visitor_crm_site_visits is
  'CRM field visit sessions: live GPS at sign-in per project/site; sign-out when leaving.';

drop trigger if exists set_visitor_crm_projects_updated_at on public.visitor_crm_projects;
create trigger set_visitor_crm_projects_updated_at
before update on public.visitor_crm_projects
for each row execute function public.set_updated_at();

drop trigger if exists set_visitor_crm_site_visits_updated_at on public.visitor_crm_site_visits;
create trigger set_visitor_crm_site_visits_updated_at
before update on public.visitor_crm_site_visits
for each row execute function public.set_updated_at();

alter table public.visitor_crm_projects enable row level security;
alter table public.visitor_crm_site_visits enable row level security;

drop policy if exists "visitor_crm_projects_select" on public.visitor_crm_projects;
create policy "visitor_crm_projects_select"
on public.visitor_crm_projects for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_projects_insert" on public.visitor_crm_projects;
create policy "visitor_crm_projects_insert"
on public.visitor_crm_projects for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_projects_update" on public.visitor_crm_projects;
create policy "visitor_crm_projects_update"
on public.visitor_crm_projects for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_projects_delete" on public.visitor_crm_projects;
create policy "visitor_crm_projects_delete"
on public.visitor_crm_projects for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_site_visits_select" on public.visitor_crm_site_visits;
create policy "visitor_crm_site_visits_select"
on public.visitor_crm_site_visits for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_site_visits_insert" on public.visitor_crm_site_visits;
create policy "visitor_crm_site_visits_insert"
on public.visitor_crm_site_visits for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_crm_site_visits_update" on public.visitor_crm_site_visits;
create policy "visitor_crm_site_visits_update"
on public.visitor_crm_site_visits for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

grant select, insert, update, delete on public.visitor_crm_projects to authenticated;
grant select, insert, update on public.visitor_crm_site_visits to authenticated;

notify pgrst, 'reload schema';
