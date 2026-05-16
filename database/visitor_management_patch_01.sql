-- Fusion Xpress — Smart Visitor Management (Patch 01)
-- -----------------------------------------------------------------------------
-- Tables: visitor_sites, visitors, visitor_demo_submissions
-- Feature key: visitor_management (portal_members.features JSON array)
--
-- Apply in Supabase SQL Editor after portal_members / is_admin() exist.
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: portal feature gate (admins/managers always pass)
-- -----------------------------------------------------------------------------
create or replace function public.portal_has_feature(feature_key text)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.portal_members pm
      where pm.user_id = (select auth.uid())
        and pm.role = 'client'
        and pm.features ? feature_key
    );
$$;

comment on function public.portal_has_feature(text) is
  'True if caller is admin/manager or a client with the feature key in portal_members.features.';

-- -----------------------------------------------------------------------------
-- Sites / locations (optional multi-branch)
-- -----------------------------------------------------------------------------
create table if not exists public.visitor_sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visitor_sites_owner_idx on public.visitor_sites (owner_id, created_at desc);

comment on table public.visitor_sites is
  'Reception / gate locations per Fusion Xpress client (visitor_management module).';

-- -----------------------------------------------------------------------------
-- Visitor bookings & check-in lifecycle
-- -----------------------------------------------------------------------------
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  site_id uuid references public.visitor_sites (id) on delete set null,
  full_name text not null,
  phone_number text not null,
  id_passport_number text not null default '',
  vehicle_plate_number text not null default '',
  host text not null,
  purpose_of_visit text not null,
  visit_date date not null,
  visit_time time not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'checked_in', 'checked_out')),
  qr_code_token text unique,
  industry_slug text,
  source text not null default 'dashboard'
    check (source in ('dashboard', 'demo_form', 'kiosk', 'api')),
  form_extra jsonb not null default '{}'::jsonb,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitors_checked_in_before_checkout check (
    checked_out_at is null or checked_in_at is not null
  )
);

create index if not exists visitors_owner_created_idx on public.visitors (owner_id, created_at desc);
create index if not exists visitors_owner_status_idx on public.visitors (owner_id, status);
create index if not exists visitors_owner_visit_date_idx on public.visitors (owner_id, visit_date desc);
create index if not exists visitors_status_idx on public.visitors (status);
create index if not exists visitors_qr_token_idx on public.visitors (qr_code_token) where qr_code_token is not null;

comment on table public.visitors is
  'Visitor pre-registrations and check-in records for Fusion Xpress Visitor Management.';
comment on column public.visitors.qr_code_token is 'Set when status becomes approved; encoded in mock/production QR passes.';
comment on column public.visitors.form_extra is 'Industry-specific or custom field payload (JSON).';

-- -----------------------------------------------------------------------------
-- Public marketing demo form submissions (industry landing demos)
-- -----------------------------------------------------------------------------
create table if not exists public.visitor_demo_submissions (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  full_name text,
  phone_number text,
  email text,
  form_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visitor_demo_submissions_industry_idx
  on public.visitor_demo_submissions (industry_slug, created_at desc);

comment on table public.visitor_demo_submissions is
  'Submissions from /fusion-xpress/smart-visitor-management/demo/* preview forms (not live check-in).';

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
drop trigger if exists set_visitor_sites_updated_at on public.visitor_sites;
create trigger set_visitor_sites_updated_at
before update on public.visitor_sites
for each row execute function public.set_updated_at();

drop trigger if exists set_visitors_updated_at on public.visitors;
create trigger set_visitors_updated_at
before update on public.visitors
for each row execute function public.set_updated_at();

-- Auto-stamp check-in / check-out timestamps when status changes
create or replace function public.sync_visitor_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'checked_in' and new.checked_in_at is null then
    new.checked_in_at := now();
  end if;
  if new.status = 'checked_out' then
    if new.checked_in_at is null then
      new.checked_in_at := coalesce(old.checked_in_at, now());
    end if;
    if new.checked_out_at is null then
      new.checked_out_at := now();
    end if;
  end if;
  if new.status = 'approved' and new.qr_code_token is null then
    new.qr_code_token := 'FX-VIS-' || replace(new.id::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists visitors_sync_status_timestamps on public.visitors;
create trigger visitors_sync_status_timestamps
before insert or update of status, qr_code_token on public.visitors
for each row execute function public.sync_visitor_status_timestamps();

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.visitor_sites enable row level security;
alter table public.visitors enable row level security;
alter table public.visitor_demo_submissions enable row level security;

-- visitor_sites
drop policy if exists "visitor_sites_select" on public.visitor_sites;
create policy "visitor_sites_select"
on public.visitor_sites for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_sites_insert" on public.visitor_sites;
create policy "visitor_sites_insert"
on public.visitor_sites for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_sites_update" on public.visitor_sites;
create policy "visitor_sites_update"
on public.visitor_sites for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitor_sites_delete" on public.visitor_sites;
create policy "visitor_sites_delete"
on public.visitor_sites for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

-- visitors
drop policy if exists "visitors_select" on public.visitors;
create policy "visitors_select"
on public.visitors for select to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitors_insert" on public.visitors;
create policy "visitors_insert"
on public.visitors for insert to authenticated
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitors_update" on public.visitors;
create policy "visitors_update"
on public.visitors for update to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
)
with check (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

drop policy if exists "visitors_delete" on public.visitors;
create policy "visitors_delete"
on public.visitors for delete to authenticated
using (
  public.is_admin()
  or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
);

-- demo submissions: admins only via authenticated select; writes via service role API
drop policy if exists "visitor_demo_submissions_admin_select" on public.visitor_demo_submissions;
create policy "visitor_demo_submissions_admin_select"
on public.visitor_demo_submissions for select to authenticated
using (public.is_admin());

revoke insert, update, delete, select on public.visitor_demo_submissions from anon;
revoke insert, delete on public.visitor_demo_submissions from authenticated;
grant select on public.visitor_demo_submissions to authenticated;

grant select, insert, update, delete on public.visitor_sites to authenticated;
grant select, insert, update, delete on public.visitors to authenticated;

comment on column public.portal_members.features is
  'Enabled feature keys: payouts, coupons, managers, email, create_campaign, ticketing, voting, reports, events, kcm_membership, teams_work, visitor_management, …';
