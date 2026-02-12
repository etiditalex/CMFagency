-- CMF Agency - Seed CFMA 2026 campaigns for Fusion Xpress
-- -----------------------------------------------------------------------------
-- Creates the cfma-2026 (Regular 500), cfma-2026-vip (VIP 1500), cfma-2026-vvip
-- (VVIP 3500) ticketing campaigns so purchases from
-- the upcoming events page "Buy Ticket Online" modal appear in the Fusion Xpress
-- dashboard.
--
-- Prerequisites:
-- - Run ticketing_voting_mvp.sql and patches (including patch_08 for VAT)
-- - At least one admin must exist in portal_members (role='admin')
--
-- Run this in Supabase SQL editor. Uses the first admin as campaign owner.
-- -----------------------------------------------------------------------------

-- Get first admin user (portal_members or fallback to admin_users)
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

  -- CFMA 2026 - Early Bird Regular (KES 500 ex-VAT)
  insert into public.campaigns (
    type, slug, title, description, currency, unit_amount, max_per_txn, is_active, created_by
  )
  select
    'ticket',
    'cfma-2026',
    'CFMA 2026 - Early Bird Regular',
    'Coast Fashion and Modelling Awards 2026 - Regular ticket. 15th August 2026, Mombasa.',
    'KES',
    500,
    10,
    true,
    admin_id
  where not exists (select 1 from public.campaigns where slug = 'cfma-2026');

  -- CFMA 2026 - Early Bird VIP (KES 1500 ex-VAT)
  insert into public.campaigns (
    type, slug, title, description, currency, unit_amount, max_per_txn, is_active, created_by
  )
  select
    'ticket',
    'cfma-2026-vip',
    'CFMA 2026 - Early Bird VIP',
    'Coast Fashion and Modelling Awards 2026 - VIP ticket. 15th August 2026, Mombasa.',
    'KES',
    1500,
    10,
    true,
    admin_id
  where not exists (select 1 from public.campaigns where slug = 'cfma-2026-vip');

  -- CFMA 2026 - Early Bird VVIP (KES 3500 ex-VAT)
  insert into public.campaigns (
    type, slug, title, description, currency, unit_amount, max_per_txn, is_active, created_by
  )
  select
    'ticket',
    'cfma-2026-vvip',
    'CFMA 2026 - Early Bird VVIP',
    'Coast Fashion and Modelling Awards 2026 - VVIP ticket. 15th August 2026, Mombasa.',
    'KES',
    3500,
    10,
    true,
    admin_id
  where not exists (select 1 from public.campaigns where slug = 'cfma-2026-vvip');

  -- Update prices for existing campaigns (in case they were created with old values)
  update public.campaigns set unit_amount = 500, title = 'CFMA 2026 - Early Bird Regular' where slug = 'cfma-2026';
  update public.campaigns set unit_amount = 1500, title = 'CFMA 2026 - Early Bird VIP' where slug = 'cfma-2026-vip';
  update public.campaigns set unit_amount = 3500, title = 'CFMA 2026 - Early Bird VVIP' where slug = 'cfma-2026-vvip';

  raise notice 'CFMA campaigns seeded. Purchases from the upcoming events page will now appear in Fusion Xpress dashboard.';
end $$;
