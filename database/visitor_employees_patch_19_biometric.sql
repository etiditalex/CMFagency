-- Fusion Xpress — Biometric recognition (Patch 19)
-- Right-thumb WebAuthn credentials for phone OS fingerprint and FIDO2 readers.
-- Attendance itself stays in visitor_employee_attendance (same path as QR scans).
-- Run in the Supabase SQL Editor after prior visitor_employees patches.
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.visitor_employee_biometric_credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  finger text not null default 'right_thumb' check (finger = 'right_thumb'),
  credential_id text not null unique,
  public_key text not null,
  sign_count bigint not null default 0,
  transports text[] not null default '{}',
  attachment text not null check (attachment in ('platform', 'cross-platform')),
  device_label text,
  aaguid text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists visitor_employee_biometric_credentials_employee_idx
  on public.visitor_employee_biometric_credentials (employee_id, created_at desc);
create index if not exists visitor_employee_biometric_credentials_owner_idx
  on public.visitor_employee_biometric_credentials (owner_id);

comment on table public.visitor_employee_biometric_credentials is
  'WebAuthn public keys for employee right-thumb attendance. The fingerprint template never leaves the phone or reader.';
comment on column public.visitor_employee_biometric_credentials.finger is
  'Always right_thumb. Enrollment and attendance only record that finger.';
comment on column public.visitor_employee_biometric_credentials.attachment is
  'platform = phone or computer operating-system fingerprint. cross-platform = external FIDO2 fingerprint reader.';

create table if not exists public.visitor_employee_biometric_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  employee_id uuid references public.visitor_employees (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('enroll', 'attend')),
  attachment text not null check (attachment in ('platform', 'cross-platform')),
  station boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists visitor_employee_biometric_challenges_expires_idx
  on public.visitor_employee_biometric_challenges (expires_at);

create table if not exists public.visitor_employee_biometric_stations (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  station_token text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.visitor_employee_biometric_stations is
  'Shared reception link for an external fingerprint reader. Identifies the organisation, not one employee.';

alter table public.visitor_employee_biometric_credentials enable row level security;
alter table public.visitor_employee_biometric_challenges enable row level security;
alter table public.visitor_employee_biometric_stations enable row level security;

drop policy if exists visitor_employee_biometric_credentials_select
  on public.visitor_employee_biometric_credentials;
create policy visitor_employee_biometric_credentials_select
  on public.visitor_employee_biometric_credentials
  for select
  to authenticated
  using (
    public.is_admin()
    or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
  );

drop policy if exists visitor_employee_biometric_stations_select
  on public.visitor_employee_biometric_stations;
create policy visitor_employee_biometric_stations_select
  on public.visitor_employee_biometric_stations
  for select
  to authenticated
  using (
    public.is_admin()
    or (owner_id = (select auth.uid()) and public.portal_has_feature('visitor_management'))
  );

notify pgrst, 'reload schema';
