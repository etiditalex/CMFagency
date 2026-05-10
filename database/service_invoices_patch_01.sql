-- Service package proforma invoices (SEO subscriptions, etc.)
-- Apply in Supabase SQL editor. Backend uses service role only (no public RLS reads).

create table if not exists public.service_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigserial unique,
  access_token text not null unique,
  package_slug text not null,
  package_title text not null,
  amount_kes integer not null check (amount_kes > 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_company text,
  customer_address text,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  transaction_id uuid references public.transactions(id) on delete set null,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_invoices_access_token on public.service_invoices (access_token);
create index if not exists idx_service_invoices_email on public.service_invoices (customer_email);
create index if not exists idx_service_invoices_created_at on public.service_invoices (created_at desc);

comment on table public.service_invoices is 'Proforma invoices for service packages; paid via Paystack or M-Pesa linked transactions.';

alter table public.service_invoices enable row level security;
