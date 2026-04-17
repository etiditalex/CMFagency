-- KCM member portal: profile category refresh + contribution wallet

alter table public.kcm_member_profiles
  drop constraint if exists kcm_member_profiles_category_check;

-- Update profile categories to the new curated options after removing old check.
update public.kcm_member_profiles
set profile_category = case
  when profile_category = 'model' then 'pageant_model'
  when profile_category = 'creative' then 'high_fashion_model'
  else profile_category
end
where profile_category in ('creative', 'model');

alter table public.kcm_member_profiles
  add constraint kcm_member_profiles_category_check
  check (profile_category in ('high_fashion_model', 'pageant_model'));

alter table public.kcm_member_profiles
  alter column profile_category set default 'high_fashion_model';

-- Wallet contributions initiated by KCM members from the member portal.
create table if not exists public.kcm_member_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.kcm_memberships(id) on delete cascade,
  amount_kes integer not null check (amount_kes > 0),
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  daraja_checkout_request_id text,
  daraja_merchant_request_id text,
  mpesa_receipt text,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kcm_member_wallet_tx_membership_id
  on public.kcm_member_wallet_transactions (membership_id, created_at desc);

create index if not exists idx_kcm_member_wallet_tx_status
  on public.kcm_member_wallet_transactions (status);

create index if not exists idx_kcm_member_wallet_tx_checkout
  on public.kcm_member_wallet_transactions (daraja_checkout_request_id);

alter table public.kcm_member_wallet_transactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kcm_member_wallet_transactions'
      and policyname = 'kcm_member_wallet_transactions_no_direct_access'
  ) then
    create policy kcm_member_wallet_transactions_no_direct_access
      on public.kcm_member_wallet_transactions
      as restrictive
      for all
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.touch_kcm_member_wallet_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_kcm_member_wallet_transactions_updated_at on public.kcm_member_wallet_transactions;
create trigger trg_touch_kcm_member_wallet_transactions_updated_at
before update on public.kcm_member_wallet_transactions
for each row execute function public.touch_kcm_member_wallet_transactions_updated_at();
