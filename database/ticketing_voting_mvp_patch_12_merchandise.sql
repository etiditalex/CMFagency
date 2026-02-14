-- CMF Agency - Merchandise campaign for Fusion Xpress payment integration
-- -----------------------------------------------------------------------------
-- Creates a "merchandise" campaign so cart checkout can use Paystack via the
-- same transactions pipeline. Transactions use unit_amount=1, quantity=total_kes
-- so any cart total is valid (up to max_per_txn).
-- Extends max_per_txn constraint to allow merchandise (cart totals can exceed 1000 KES).
--
-- Prerequisites: At least one admin in portal_members or admin_users
-- -----------------------------------------------------------------------------

-- Allow higher max_per_txn for merchandise (cart totals can be 100k+ KES)
alter table public.campaigns drop constraint if exists campaigns_max_per_txn_check;
alter table public.campaigns add constraint campaigns_max_per_txn_check
  check (max_per_txn > 0 and max_per_txn <= 1000000);

-- Merchandise uses quantity=total_kes; cart totals exceed 1000. Relax transactions.quantity.
alter table public.transactions drop constraint if exists transactions_quantity_check;
alter table public.transactions add constraint transactions_quantity_check
  check (quantity > 0 and quantity <= 1000000);

do $$
declare
  admin_id uuid;
begin
  select user_id into admin_id
  from public.portal_members
  where role = 'admin'
  limit 1;

  if admin_id is null then
    select user_id into admin_id
    from public.admin_users
    limit 1;
  end if;

  if admin_id is null then
    raise notice 'No admin user found. Add an admin to portal_members or admin_users first.';
    return;
  end if;

  -- Merchandise: unit_amount=1, quantity=total in KES, so any cart total works
  insert into public.campaigns (
    type, slug, title, description, currency, unit_amount, max_per_txn, is_active, created_by
  )
  select
    'ticket',
    'merchandise',
    'Changer Fusions Merchandise',
    'Branded merchandise - T-shirts, hoodies, water bottles, key holders.',
    'KES',
    1,
    1000000,
    true,
    admin_id
  where not exists (select 1 from public.campaigns where slug = 'merchandise');

  raise notice 'Merchandise campaign seeded. Cart checkout will use Fusion Xpress payment.';
end $$;
