-- Fusion Xpress — Attendance PDF digest send log (Patch 18)
-- Tracks daily / weekly / monthly summary emails so the cron does not resend.
-- Run in Supabase SQL Editor after prior visitor_employees patches.
-- -----------------------------------------------------------------------------

create table if not exists public.visitor_employee_attendance_digests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  digest_kind text not null check (digest_kind in ('daily', 'weekly', 'monthly')),
  period_key text not null,
  period_from date not null,
  period_to date not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, period_key)
);

create index if not exists visitor_employee_attendance_digests_owner_sent_idx
  on public.visitor_employee_attendance_digests (owner_id, sent_at desc);

comment on table public.visitor_employee_attendance_digests is
  'Idempotency log for scheduled attendance PDF digest emails (daily / weekly / monthly).';

alter table public.visitor_employee_attendance_digests enable row level security;

drop policy if exists visitor_employee_attendance_digests_owner_select
  on public.visitor_employee_attendance_digests;
create policy visitor_employee_attendance_digests_owner_select
  on public.visitor_employee_attendance_digests
  for select
  using (auth.uid() = owner_id);

notify pgrst, 'reload schema';
