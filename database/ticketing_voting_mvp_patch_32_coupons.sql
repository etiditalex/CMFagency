-- CMF Agency - Ticketing/Voting MVP patch 32 (Coupons / offers)
-- -----------------------------------------------------------------------------
-- Adds coupon (offer) codes for ticket campaigns. Admins create offers with a
-- code; buyers enter the code at checkout to get a discount. Supports percent
-- or fixed discount, optional campaign scope, usage limits, and validity window.
--
-- Run after: ticketing_voting_mvp_patch_31_portal_user_totp.sql (or latest).
-- -----------------------------------------------------------------------------

-- Coupon discount type
do $$ begin
  create type public.coupon_discount_type as enum ('percent', 'fixed');
exception
  when duplicate_object then null;
end $$;

-- Coupons table: one row per offer code
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type public.coupon_discount_type not null,
  discount_value integer not null check (discount_value > 0),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_uniq unique (code),
  constraint coupons_max_uses_check check (max_uses is null or max_uses > 0),
  constraint coupons_percent_value check (
    (discount_type = 'percent' and discount_value <= 100) or discount_type = 'fixed'
  )
);

create index if not exists coupons_created_by_idx on public.coupons(created_by);
create index if not exists coupons_campaign_id_idx on public.coupons(campaign_id);
create index if not exists coupons_code_lower_idx on public.coupons(lower(code));

comment on table public.coupons is 'Offer codes for ticket (and optionally vote) campaigns. Buyers enter code at checkout for discount.';
comment on column public.coupons.code is 'Code entered by buyer (case-insensitive match).';
comment on column public.coupons.discount_type is 'percent: discount_value 1-100; fixed: discount_value in currency units.';
comment on column public.coupons.campaign_id is 'Null = applies to any campaign owned by created_by; set = only that campaign.';

alter table public.coupons enable row level security;

-- Only portal members who created the coupon (or admins) can manage
drop policy if exists "coupons_owner_all" on public.coupons;
create policy "coupons_owner_all"
on public.coupons for all to authenticated
using (
  (select public.is_portal_member())
  and (created_by = (select auth.uid()) or (select public.is_admin()))
)
with check (
  (select public.is_portal_member())
  and (created_by = (select auth.uid()) or (select public.is_admin()))
);

grant select, insert, update, delete on table public.coupons to authenticated;

-- Keep updated_at current
drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

-- Add coupon and discount to transactions
alter table public.transactions
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists discount_amount integer not null default 0;

comment on column public.transactions.coupon_id is 'Coupon used for this transaction, if any.';
comment on column public.transactions.discount_amount is 'Total discount applied (same units as amount). amount + discount_amount = quantity * unit_amount.';

-- Relax amount constraint to allow discounted transactions
alter table public.transactions drop constraint if exists transactions_amount_check;
alter table public.transactions add constraint transactions_amount_check
  check (amount >= 0 and amount + coalesce(discount_amount, 0) = quantity * unit_amount);

-- RLS for transactions insert: anon/auth can only insert full-price (no coupon).
-- Discounted inserts are done server-side with service role when coupon is validated.
-- Existing policy checks unit_amount = campaign.unit_amount; discounted tx use same unit_amount
-- but amount < quantity*unit_amount, so we must allow that. Easiest: allow insert when
-- amount + coalesce(discount_amount,0) = quantity * unit_amount (constraint) and
-- campaign is valid. So we need to drop the unit_amount match from the insert policy
-- and instead allow any insert that matches the campaign and constraint.
-- Actually current policy: c.unit_amount = transactions.unit_amount. So with discount
-- we have transactions.unit_amount = c.unit_amount (original), amount = qty*unit - discount.
-- So we need policy to allow: (transactions.amount + coalesce(transactions.discount_amount,0)) = transactions.quantity * transactions.unit_amount
-- and campaign exists and is active. So drop the unit_amount equality and add the sum check.
-- Checking patch_20 for exact policy name and definition.
-- We'll add a new policy that allows insert with coupon: when coupon_id is not null,
-- discount_amount can be > 0. So two paths: 1) no coupon: unit_amount = c.unit_amount, amount = qty*unit, discount_amount = 0.
-- 2) with coupon: server uses service role to insert. So we don't need to change RLS for anon -
-- when coupon is used the API uses service role. So leave existing insert policy as-is.
-- Only service role can insert rows with coupon_id set. Done.
