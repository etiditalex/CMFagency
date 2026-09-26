-- Kenya's Ideal Mr & Miss 2026 contestant applications.
-- Public submits via the service-role API. Fusion Xpress admins can read rows.

create table if not exists public.ideal_mr_miss_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null,
  full_name text not null,
  date_of_birth date not null,
  category text not null check (category in ('kids', 'teens', 'adults')),
  applying_as text not null check (applying_as in ('mr', 'miss')),
  town_county text not null,
  phone_calls text,
  phone_whatsapp text,
  email text,
  guardian_name text,
  guardian_relationship text,
  guardian_phone text,
  guardian_email text,
  institution text,
  about text not null,
  why_participate text not null,
  talent text not null,
  models_for_education text not null,
  photo_path text,
  prior_event boolean not null,
  prior_event_name text,
  available boolean not null,
  accuracy_confirmed boolean not null,
  fee_acknowledged boolean not null,
  contact_agreed boolean not null,
  guardian_consent boolean,
  marketing_consent boolean not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'shortlisted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists ideal_mr_miss_applications_created_at_idx
  on public.ideal_mr_miss_applications (created_at desc);

alter table public.ideal_mr_miss_applications
  add column if not exists application_code text;

create unique index if not exists ideal_mr_miss_applications_code_idx
  on public.ideal_mr_miss_applications (application_code);

comment on table public.ideal_mr_miss_applications is
  'Contestant applications for Kenya''s Ideal Mr & Miss 2026 (Models for Education).';

alter table public.ideal_mr_miss_applications enable row level security;

drop policy if exists "ideal_mr_miss_applications_admin_select" on public.ideal_mr_miss_applications;
create policy "ideal_mr_miss_applications_admin_select"
on public.ideal_mr_miss_applications
for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on public.ideal_mr_miss_applications from anon, authenticated;
grant select on public.ideal_mr_miss_applications to authenticated;
grant select, insert, update, delete on public.ideal_mr_miss_applications to service_role;
