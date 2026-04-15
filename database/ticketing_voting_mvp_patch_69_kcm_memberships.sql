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

-- KCM member profile table (created after successful payment)
create table if not exists public.kcm_member_profiles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.kcm_memberships(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kcm_member_profiles_membership_id on public.kcm_member_profiles (membership_id);
create index if not exists idx_kcm_member_profiles_email on public.kcm_member_profiles (email);

alter table public.kcm_member_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_member_profiles'
      and policyname = 'kcm_member_profiles_no_direct_access'
  ) then
    create policy kcm_member_profiles_no_direct_access
      on public.kcm_member_profiles
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.touch_kcm_member_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_kcm_member_profiles_updated_at on public.kcm_member_profiles;
create trigger trg_touch_kcm_member_profiles_updated_at
before update on public.kcm_member_profiles
for each row execute function public.touch_kcm_member_profiles_updated_at();

-- One-time email verification codes for KCM member login
create table if not exists public.kcm_member_login_codes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.kcm_memberships(id) on delete cascade,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_kcm_member_login_codes_email on public.kcm_member_login_codes (email);
create index if not exists idx_kcm_member_login_codes_expires_at on public.kcm_member_login_codes (expires_at);

alter table public.kcm_member_login_codes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_member_login_codes'
      and policyname = 'kcm_member_login_codes_no_direct_access'
  ) then
    create policy kcm_member_login_codes_no_direct_access
      on public.kcm_member_login_codes
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

-- Session table for KCM member portal
create table if not exists public.kcm_member_sessions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.kcm_memberships(id) on delete cascade,
  email text not null,
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_kcm_member_sessions_email on public.kcm_member_sessions (email);
create index if not exists idx_kcm_member_sessions_expires_at on public.kcm_member_sessions (expires_at);

alter table public.kcm_member_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_member_sessions'
      and policyname = 'kcm_member_sessions_no_direct_access'
  ) then
    create policy kcm_member_sessions_no_direct_access
      on public.kcm_member_sessions
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

-- Written portfolio narrative (member-editable after login)
alter table public.kcm_member_profiles add column if not exists portfolio_text text;
alter table public.kcm_member_profiles add column if not exists cover_url text;
alter table public.kcm_member_profiles add column if not exists profile_category text;
alter table public.kcm_member_profiles add column if not exists professional_title text;
alter table public.kcm_member_profiles add column if not exists social_instagram text;
alter table public.kcm_member_profiles add column if not exists social_facebook text;
alter table public.kcm_member_profiles add column if not exists social_tiktok text;
alter table public.kcm_member_profiles add column if not exists social_x text;

update public.kcm_member_profiles
set profile_category = 'creative'
where profile_category is null or btrim(profile_category) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kcm_member_profiles_category_check'
  ) then
    alter table public.kcm_member_profiles
      add constraint kcm_member_profiles_category_check
      check (profile_category in ('creative', 'model'));
  end if;
end $$;

alter table public.kcm_member_profiles alter column profile_category set default 'creative';

-- Uploaded portfolio files (images / PDFs), managed via service role
create table if not exists public.kcm_member_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.kcm_memberships(id) on delete cascade,
  storage_path text not null,
  file_url text not null,
  mime_type text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_kcm_member_portfolio_items_membership_id on public.kcm_member_portfolio_items (membership_id);
create index if not exists idx_kcm_member_portfolio_items_sort on public.kcm_member_portfolio_items (membership_id, sort_order);

alter table public.kcm_member_portfolio_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_member_portfolio_items'
      and policyname = 'kcm_member_portfolio_items_no_direct_access'
  ) then
    create policy kcm_member_portfolio_items_no_direct_access
      on public.kcm_member_portfolio_items
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

-- KCM public registration fee (M-Pesa STK amount + copy on marketing pages). Editable in Fusion Xpress.
create table if not exists public.kcm_registration_settings (
  id smallint primary key default 1 constraint kcm_registration_settings_singleton check (id = 1),
  registration_fee_kes integer not null default 50 check (registration_fee_kes >= 1 and registration_fee_kes <= 1000000),
  updated_at timestamptz not null default now()
);

insert into public.kcm_registration_settings (id, registration_fee_kes)
values (1, 50)
on conflict (id) do nothing;

alter table public.kcm_registration_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_registration_settings'
      and policyname = 'kcm_registration_settings_no_direct_access'
  ) then
    create policy kcm_registration_settings_no_direct_access
      on public.kcm_registration_settings
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;
