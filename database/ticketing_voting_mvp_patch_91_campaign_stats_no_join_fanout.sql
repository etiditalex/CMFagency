-- campaign_stats was joining transactions AND votes in one FROM clause.
-- That cartesian-products rows: each successful payment is summed once per vote row,
-- so voting revenue/vote totals explode vs the home dashboard and Sales & votes page.
-- Aggregate each fact in its own subquery (same visibility rules as patch 44).

create or replace view public.campaign_stats
with (security_invoker = on)
as
select
  c.id as campaign_id,
  c.type as campaign_type,
  c.slug,
  c.title,
  c.created_by,
  coalesce((
    select sum(r.amount)
    from public.reportable_transactions r
    where r.campaign_id = c.id
      and r.status = 'success'
  ), 0) as total_amount,
  coalesce((
    select sum(case when coalesce(r.quantity, 0) < 1 then 1 else r.quantity end)
    from public.reportable_transactions r
    where r.campaign_id = c.id
      and r.status = 'success'
      and r.resolved_type = 'vote'
  ), 0) as total_votes,
  coalesce((
    select count(*)
    from public.reportable_transactions r
    where r.campaign_id = c.id
      and r.status = 'success'
  ), 0) as successful_transactions
from public.campaigns c
where (select public.is_portal_member())
  and (
    (select public.is_admin())
    or c.created_by = (select auth.uid())
    or (select public.campaign_visible_by_event_owner(c))
  );

comment on view public.campaign_stats is
  'Per-campaign success totals from reportable_transactions (no transactions×votes join). Matches Fusion Xpress dashboard/sales KPIs.';

grant select on table public.campaign_stats to authenticated;

do $$ begin raise notice 'campaign_stats rebuilt without join fan-out.'; end $$;
