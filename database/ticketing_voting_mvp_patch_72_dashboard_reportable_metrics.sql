-- Single-call aggregates for Fusion Xpress dashboard home (replaces paging all successful rows).
-- Run in Supabase SQL editor or via migration pipeline before relying on dashboard_reportable_success_metrics.

create or replace function public.dashboard_reportable_success_metrics(p_campaign_ids uuid[])
returns jsonb
language sql
stable
set search_path = public
as $$
  with filtered as (
    select
      r.currency,
      r.resolved_type,
      r.campaign_id,
      r.amount,
      r.quantity
    from public.reportable_transactions r
    where r.status = 'success'
      and p_campaign_ids is not null
      and cardinality(p_campaign_ids) > 0
      and r.campaign_id = any (p_campaign_ids)
  ),
  rollups as (
    select
      currency,
      resolved_type,
      campaign_id,
      sum(amount)::numeric as amount_sum,
      sum(case when coalesce(quantity, 0) < 1 then 1 else quantity end)::bigint as qty_effective_sum
    from filtered
    group by currency, resolved_type, campaign_id
  )
  select jsonb_build_object(
    'successful_count', coalesce((select count(*)::bigint from filtered), 0::bigint),
    'rollups', coalesce((select jsonb_agg(to_jsonb(r)) from rollups r), '[]'::jsonb)
  );
$$;

comment on function public.dashboard_reportable_success_metrics(uuid[]) is
  'Dashboard: success transaction count and per-(currency,type,campaign) amount/qty rollups without loading every row.';

grant execute on function public.dashboard_reportable_success_metrics(uuid[]) to authenticated;
grant execute on function public.dashboard_reportable_success_metrics(uuid[]) to service_role;
