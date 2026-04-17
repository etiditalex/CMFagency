-- Stable reporting source for Fusion Xpress dashboard.
-- Centralizes transaction type resolution in SQL so ticket/vote/merch reports
-- stay consistent even when historical transaction rows have missing campaign_type.

create or replace view public.reportable_transactions
with (security_invoker = on)
as
select
  t.id,
  t.campaign_id,
  t.amount,
  t.currency,
  t.quantity,
  t.provider,
  t.status,
  t.created_at,
  case
    when lower(coalesce(c.slug, '')) = 'merchandise' then 'merchandise'
    when nullif(lower(trim(coalesce(t.campaign_type::text, ''))), '') is not null then lower(trim(t.campaign_type::text))
    when nullif(lower(trim(coalesce(c.type::text, ''))), '') is not null then lower(trim(c.type::text))
    else 'ticket'
  end as resolved_type
from public.transactions t
join public.campaigns c on c.id = t.campaign_id;

grant select on table public.reportable_transactions to authenticated;
