-- CMF Agency - Ticketing/Voting MVP patch 03 (Remove admin allowlist restrictions)
-- -----------------------------------------------------------------------------
-- Use this if you already ran patch_02 and want to remove admin gating for now.
-- This restores "owner-only" access (created_by = auth.uid()) without requiring
-- membership in public.admin_users / public.is_admin().
--
-- NOTE:
-- - We keep the public payment pages anonymous.
-- - Dashboard pages still require Supabase auth, but not admin allowlist.
-- - We keep campaign_stats safely scoped to auth.uid() to avoid data leakage.
-- -----------------------------------------------------------------------------

-- campaigns: owner can manage their campaigns (no admin allowlist)
drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- contestants: owner can manage contestants under their campaigns
drop policy if exists "contestants_owner_write" on public.contestants;
create policy "contestants_owner_write"
on public.contestants
for insert
to authenticated
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

drop policy if exists "contestants_owner_update" on public.contestants;
create policy "contestants_owner_update"
on public.contestants
for update
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

drop policy if exists "contestants_owner_delete" on public.contestants;
create policy "contestants_owner_delete"
on public.contestants
for delete
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

-- transactions: owner can read their campaign transactions (dashboard)
drop policy if exists "transactions_owner_read" on public.transactions;
create policy "transactions_owner_read"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = transactions.campaign_id and c.created_by = auth.uid()
  )
);

-- votes/tickets/ticket_issues: owner can read fulfillment for their campaigns
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes
for select
to authenticated
using (
  exists (select 1 from public.campaigns c where c.id = votes.campaign_id and c.created_by = auth.uid())
);

drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets
for select
to authenticated
using (
  exists (select 1 from public.campaigns c where c.id = tickets.campaign_id and c.created_by = auth.uid())
);

drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues
for select
to authenticated
using (
  exists (select 1 from public.campaigns c where c.id = ticket_issues.campaign_id and c.created_by = auth.uid())
);

-- Keep campaign_stats scoped to current user (prevents any authenticated user from reading global stats).
create or replace view public.campaign_stats as
select
  c.id as campaign_id,
  c.type as campaign_type,
  c.slug,
  c.title,
  c.created_by,
  coalesce(sum(case when t.status = 'success' then t.amount end), 0) as total_amount,
  coalesce(sum(v.votes), 0) as total_votes,
  coalesce(count(distinct case when t.status = 'success' then t.id end), 0) as successful_transactions
from public.campaigns c
left join public.transactions t on t.campaign_id = c.id
left join public.votes v on v.campaign_id = c.id
where c.created_by = auth.uid()
group by c.id;

