-- KCM memberships table for public registration + Fusion Xpress review workflow

create table if not exists public.kcm_memberships (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  second_name text not null,
  contact text not null,
  email text not null,
  experience text not null,
  top_model_interest boolean not null default false,
  payment_amount_kes integer not null default 50 check (payment_amount_kes >= 0),
  payment_confirmed boolean not null default false,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'success', 'failed')),
  daraja_checkout_request_id text,
  daraja_merchant_request_id text,
  mpesa_receipt text,
  paid_at timestamptz,
  status text not null default 'new' check (status in ('new', 'in_review', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed from an earlier partial run, ensure new columns exist.
alter table public.kcm_memberships add column if not exists payment_status text;
alter table public.kcm_memberships add column if not exists daraja_checkout_request_id text;
alter table public.kcm_memberships add column if not exists daraja_merchant_request_id text;
alter table public.kcm_memberships add column if not exists mpesa_receipt text;
alter table public.kcm_memberships add column if not exists paid_at timestamptz;

-- Backfill + enforce check only when column was added without NOT NULL / default.
update public.kcm_memberships set payment_status = 'pending' where payment_status is null;
alter table public.kcm_memberships alter column payment_status set default 'pending';
alter table public.kcm_memberships alter column payment_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kcm_memberships_payment_status_check'
  ) then
    alter table public.kcm_memberships
      add constraint kcm_memberships_payment_status_check
      check (payment_status in ('pending', 'success', 'failed'));
  end if;
end $$;

create index if not exists idx_kcm_memberships_created_at on public.kcm_memberships (created_at desc);
create index if not exists idx_kcm_memberships_status on public.kcm_memberships (status);
create index if not exists idx_kcm_memberships_email on public.kcm_memberships (email);
create index if not exists idx_kcm_memberships_payment_status on public.kcm_memberships (payment_status);
create index if not exists idx_kcm_memberships_checkout on public.kcm_memberships (daraja_checkout_request_id);

alter table public.kcm_memberships enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_memberships'
      and policyname = 'kcm_memberships_no_direct_access'
  ) then
    create policy kcm_memberships_no_direct_access
      on public.kcm_memberships
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.touch_kcm_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_kcm_memberships_updated_at on public.kcm_memberships;
create trigger trg_touch_kcm_memberships_updated_at
before update on public.kcm_memberships
for each row execute function public.touch_kcm_memberships_updated_at();
