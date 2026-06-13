-- Fusion Xpress — Employee module: external integration API keys (Patch 13)
-- Run after visitor_employees_patch_01.sql
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_integration_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Integration',
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['employees:read', 'attendance:read', 'leave:read']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists visitor_integration_api_keys_hash_active_idx
  on public.visitor_integration_api_keys (key_hash)
  where revoked_at is null;

create index if not exists visitor_integration_api_keys_owner_idx
  on public.visitor_integration_api_keys (owner_id, created_at desc);

comment on table public.visitor_integration_api_keys is
  'API keys for HR/payroll and third-party integrations (Bearer fx_int_live_…).';

alter table public.visitor_integration_api_keys enable row level security;
