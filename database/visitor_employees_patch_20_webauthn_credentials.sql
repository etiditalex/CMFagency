-- Fusion Xpress — WebAuthn credentials for biometric attendance (Patch 20)
-- Run in Supabase SQL Editor after visitor_employees_patch_19_biometric_fingerprint.sql.
--
-- Shared reception kiosk: each employee enrolls once on that terminal via the
-- dashboard. Attendance check-in confirms identity (member ID / name search)
-- then asserts the stored platform credential. This is not 1:N fingerprint
-- matching and is not a spoof-resistant biometric guarantee.
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  device_label text not null default '',
  device_id text,
  sign_count bigint not null default 0,
  transports text[] not null default '{}'::text[],
  webauthn_user_id text,
  aaguid text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  unique (credential_id)
);

create index if not exists visitor_employee_webauthn_credentials_employee_idx
  on public.visitor_employee_webauthn_credentials (employee_id, status);

create index if not exists visitor_employee_webauthn_credentials_owner_idx
  on public.visitor_employee_webauthn_credentials (owner_id, status);

comment on table public.visitor_employee_webauthn_credentials is
  'Platform WebAuthn credentials for employee attendance on the shared reception kiosk. Stores credential ID + public key for server-side assertion verification.';

create table if not exists public.visitor_employee_webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  ceremony text not null check (ceremony in ('register', 'authenticate')),
  challenge text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists visitor_employee_webauthn_challenges_lookup_idx
  on public.visitor_employee_webauthn_challenges (employee_id, ceremony, expires_at);

create index if not exists visitor_employee_webauthn_challenges_expiry_idx
  on public.visitor_employee_webauthn_challenges (expires_at);

comment on table public.visitor_employee_webauthn_challenges is
  'Short-lived WebAuthn ceremony challenges (kiosk has no login session).';

alter table public.visitor_employee_webauthn_credentials enable row level security;
alter table public.visitor_employee_webauthn_challenges enable row level security;

drop policy if exists visitor_employee_webauthn_credentials_owner_select
  on public.visitor_employee_webauthn_credentials;
create policy visitor_employee_webauthn_credentials_owner_select
  on public.visitor_employee_webauthn_credentials
  for select
  using (auth.uid() = owner_id);

drop policy if exists visitor_employee_webauthn_challenges_owner_select
  on public.visitor_employee_webauthn_challenges;
create policy visitor_employee_webauthn_challenges_owner_select
  on public.visitor_employee_webauthn_challenges
  for select
  using (auth.uid() = owner_id);

notify pgrst, 'reload schema';
