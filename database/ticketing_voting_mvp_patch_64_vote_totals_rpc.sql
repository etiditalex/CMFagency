-- Fast vote totals for public voting UI: aggregate in Postgres instead of paging all transactions.
-- Also adds a partial index matching successful vote rows with contestants.

-- -----------------------------------------------------------------------------
-- Partial index: small subset of rows; supports per-campaign GROUP BY / filters.
-- -----------------------------------------------------------------------------
create index if not exists transactions_vote_success_campaign_contestant_idx
  on public.transactions (campaign_id, contestant_id)
  where campaign_type = 'vote'
    and status = 'success'
    and contestant_id is not null;

-- -----------------------------------------------------------------------------
-- Single campaign: one round-trip from API routes (replaces N×1000 row fetches).
-- -----------------------------------------------------------------------------
create or replace function public.get_vote_transaction_totals_by_campaign(p_campaign_id uuid)
returns table (contestant_id uuid, total_quantity bigint)
language sql
stable
set search_path = public
as $$
  select
    t.contestant_id,
    sum(t.quantity::bigint) as total_quantity
  from public.transactions t
  where t.campaign_id = p_campaign_id
    and t.campaign_type = 'vote'
    and t.status = 'success'
    and t.contestant_id is not null
  group by t.contestant_id;
$$;

comment on function public.get_vote_transaction_totals_by_campaign(uuid) is
  'Aggregated successful vote quantities per contestant (same basis as legacy transaction paging in page-data).';

-- -----------------------------------------------------------------------------
-- Catalog (/voting/all): one aggregation for all visible vote campaigns.
-- -----------------------------------------------------------------------------
create or replace function public.get_vote_transaction_totals_for_campaigns(p_campaign_ids uuid[])
returns table (campaign_id uuid, contestant_id uuid, total_quantity bigint)
language sql
stable
set search_path = public
as $$
  select
    t.campaign_id,
    t.contestant_id,
    sum(t.quantity::bigint) as total_quantity
  from public.transactions t
  where t.campaign_id = any (p_campaign_ids)
    and t.campaign_type = 'vote'
    and t.status = 'success'
    and t.contestant_id is not null
  group by t.campaign_id, t.contestant_id;
$$;

comment on function public.get_vote_transaction_totals_for_campaigns(uuid[]) is
  'Aggregated vote quantities for many campaigns (voting catalog sort order vs public campaign pages).';

grant execute on function public.get_vote_transaction_totals_by_campaign(uuid) to service_role;
grant execute on function public.get_vote_transaction_totals_for_campaigns(uuid[]) to service_role;
