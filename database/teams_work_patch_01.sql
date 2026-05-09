-- Teams Work (performance monitoring) - Patch 01
-- Creates tables for work entries + attachments.
--
-- Apply in Supabase SQL editor (or your migration pipeline).

create extension if not exists "pgcrypto";

create table if not exists public.teams_work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text null,
  entry_type text not null check (entry_type in ('daily_log','upload')),
  title text null,
  body text null,
  work_date date not null default (now() at time zone 'utc')::date,
  status text not null default 'submitted' check (status in ('submitted','verified','needs_changes','rejected')),
  admin_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_work_entries_user_date_idx
  on public.teams_work_entries (user_id, work_date desc, created_at desc);

create index if not exists teams_work_entries_status_idx
  on public.teams_work_entries (status, work_date desc);

create table if not exists public.teams_work_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.teams_work_entries(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_url text not null,
  file_name text null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists teams_work_attachments_entry_idx
  on public.teams_work_attachments (entry_id, created_at desc);

