-- Attendance registrations for the Sustainable Fashion & Models Empowerment Forum
-- (Kenya-Coast Models, 28 November 2026). Public writes go through the service-role API.

create table if not exists public.kenya_coast_models_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_calls text not null,
  phone_whatsapp text not null,
  email text,
  town text not null,
  county text not null,
  is_member boolean not null,
  attendee_type text not null check (attendee_type in ('model', 'designer', 'guest')),
  model_level text check (model_level in ('emerging', 'professional')),
  brand_name text,
  fee_kes integer not null check (fee_kes in (200, 300)),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'success', 'failed')),
  payment_confirmed boolean not null default false,
  mpesa_receipt text,
  paid_at timestamptz,
  daraja_checkout_request_id text,
  daraja_merchant_request_id text,
  details_confirmed boolean not null default false,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists kenya_coast_models_registrations_created_at_idx
  on public.kenya_coast_models_registrations (created_at desc);

create unique index if not exists kenya_coast_models_registrations_checkout_idx
  on public.kenya_coast_models_registrations (daraja_checkout_request_id)
  where daraja_checkout_request_id is not null;

comment on table public.kenya_coast_models_registrations is
  'Paid attendance registrations for the Kenya-Coast Models Sustainable Fashion & Models Empowerment Forum.';

alter table public.kenya_coast_models_registrations enable row level security;

drop policy if exists "kenya_coast_models_registrations_admin_select" on public.kenya_coast_models_registrations;
create policy "kenya_coast_models_registrations_admin_select"
on public.kenya_coast_models_registrations
for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on public.kenya_coast_models_registrations from anon, authenticated;
grant select on public.kenya_coast_models_registrations to authenticated;
grant select, insert, update, delete on public.kenya_coast_models_registrations to service_role;
