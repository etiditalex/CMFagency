-- Vote totals: count successful rows for vote *campaigns*, even when `transactions.campaign_type`
-- was null or wrong (must match fulfillment backfill in app).

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
  inner join public.campaigns c on c.id = t.campaign_id and c.type = 'vote'
  where t.campaign_id = p_campaign_id
    and t.status = 'success'
    and t.contestant_id is not null
  group by t.contestant_id;
$$;

comment on function public.get_vote_transaction_totals_by_campaign(uuid) is
  'Aggregated successful vote quantities per contestant (join campaigns.type = vote).';

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
  inner join public.campaigns c on c.id = t.campaign_id and c.type = 'vote'
  where t.campaign_id = any (p_campaign_ids)
    and t.status = 'success'
    and t.contestant_id is not null
  group by t.campaign_id, t.contestant_id;
$$;

comment on function public.get_vote_transaction_totals_for_campaigns(uuid[]) is
  'Aggregated vote quantities for many campaigns (join campaigns.type = vote).';

grant execute on function public.get_vote_transaction_totals_by_campaign(uuid) to service_role;
grant execute on function public.get_vote_transaction_totals_for_campaigns(uuid[]) to service_role;
