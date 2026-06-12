-- CMFA in-house registration (complimentary tickets with approval workflow)
-- Apply in Supabase SQL editor after patch_75.
-- -----------------------------------------------------------------------------

create table if not exists public.cmfa_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  event_slug text not null default 'coast-fashion-modelling-awards-2026',
  name text not null,
  email text not null,
  phone text,
  designation text not null check (
    designation in ('cmf_executive', 'high_fashion_model', 'award_contestant', 'sponsor_partner')
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_guest boolean not null default false,
  parent_registration_id uuid references public.cmfa_registrations(id) on delete cascade,
  checked_in_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cmfa_registrations_status_idx on public.cmfa_registrations(status);
create index if not exists cmfa_registrations_event_slug_idx on public.cmfa_registrations(event_slug);
create index if not exists cmfa_registrations_email_idx on public.cmfa_registrations(email);
create index if not exists cmfa_registrations_parent_idx on public.cmfa_registrations(parent_registration_id);

comment on table public.cmfa_registrations is
  'CMFA complimentary in-house registrations (executives, models, contestants, sponsors). Approved entries receive QR tickets via email.';

alter table public.cmfa_registrations enable row level security;

-- No public read; inserts go through service-role API routes.
drop policy if exists "cmfa_registrations_no_public" on public.cmfa_registrations;
create policy "cmfa_registrations_no_public"
on public.cmfa_registrations for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete on table public.cmfa_registrations to service_role;

drop trigger if exists set_cmfa_registrations_updated_at on public.cmfa_registrations;
create trigger set_cmfa_registrations_updated_at
before update on public.cmfa_registrations
for each row execute function public.set_updated_at();
