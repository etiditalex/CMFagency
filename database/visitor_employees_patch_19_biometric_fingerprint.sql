-- Fusion Xpress — Biometric fingerprint module (Patch 19)
-- Enrollment records + shared biometric terminals for employee attendance.
-- Run in Supabase SQL Editor after prior visitor_employees patches.
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_biometric_terminals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Reception fingerprint terminal',
  terminal_token text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id),
  unique (terminal_token)
);

create index if not exists visitor_employee_biometric_terminals_owner_idx
  on public.visitor_employee_biometric_terminals (owner_id);

comment on table public.visitor_employee_biometric_terminals is
  'Shared biometric fingerprint terminals per organisation (kiosk-style attendance).';

create table if not exists public.visitor_employee_biometric_enrollments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  employee_id uuid not null references public.visitor_employees (id) on delete cascade,
  finger_index smallint not null check (finger_index between 1 and 10),
  finger_label text not null,
  template_hash text not null,
  template_salt text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  vendor text not null default 'fusion_pad',
  external_id text,
  enrolled_by uuid references auth.users (id) on delete set null,
  enrolled_at timestamptz not null default now(),
  last_matched_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists visitor_employee_biometric_enrollments_active_finger_uidx
  on public.visitor_employee_biometric_enrollments (employee_id, finger_index)
  where status = 'active';

create index if not exists visitor_employee_biometric_enrollments_owner_idx
  on public.visitor_employee_biometric_enrollments (owner_id, status);

create index if not exists visitor_employee_biometric_enrollments_employee_idx
  on public.visitor_employee_biometric_enrollments (employee_id);

create unique index if not exists visitor_employee_biometric_enrollments_external_uidx
  on public.visitor_employee_biometric_enrollments (owner_id, external_id)
  where external_id is not null and status = 'active';

comment on table public.visitor_employee_biometric_enrollments is
  'Fingerprint enrollments for employee attendance (Fusion pad or hardware vendor id).';

alter table public.visitor_employee_biometric_terminals enable row level security;
alter table public.visitor_employee_biometric_enrollments enable row level security;

drop policy if exists visitor_employee_biometric_terminals_owner_select
  on public.visitor_employee_biometric_terminals;
create policy visitor_employee_biometric_terminals_owner_select
  on public.visitor_employee_biometric_terminals
  for select
  using (auth.uid() = owner_id);

drop policy if exists visitor_employee_biometric_enrollments_owner_select
  on public.visitor_employee_biometric_enrollments;
create policy visitor_employee_biometric_enrollments_owner_select
  on public.visitor_employee_biometric_enrollments
  for select
  using (auth.uid() = owner_id);

notify pgrst, 'reload schema';
