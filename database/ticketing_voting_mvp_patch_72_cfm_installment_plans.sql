-- Lipa Pole Pole: partial ticket payments with balance tracking and reminder emails.
-- Run in Supabase SQL editor. Service role (API routes) performs all reads/writes; RLS enabled with no policies = anon/auth blocked.

create table if not exists public.cfm_installment_plans (
  id uuid primary key default gen_random_uuid(),
  installment_token text not null unique,
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  campaign_slug text not null,
  email text not null,
  phone text not null,
  payer_name text,
  referred_by text,
  ticket_quantity integer not null check (ticket_quantity > 0 and ticket_quantity <= 10000),
  unit_amount integer not null check (unit_amount > 0),
  total_due integer not null check (total_due > 0),
  amount_paid integer not null default 0 check (amount_paid >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  next_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cfm_installment_plans_campaign_status_idx
  on public.cfm_installment_plans (campaign_id, status);

create index if not exists cfm_installment_plans_reminder_idx
  on public.cfm_installment_plans (status, next_reminder_at)
  where status = 'active';

comment on table public.cfm_installment_plans is 'CFM Lipa Pole Pole: pay tickets in installments; tickets issued when amount_paid reaches total_due.';

alter table public.cfm_installment_plans enable row level security;
