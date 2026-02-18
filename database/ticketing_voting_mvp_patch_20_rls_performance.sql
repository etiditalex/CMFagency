-- CMF Agency - RLS Performance: Optimize auth.uid() and helper function calls
-- -----------------------------------------------------------------------------
-- Supabase recommends wrapping auth.uid() and helper functions (is_portal_member,
-- is_admin) in (select ...) so they are evaluated once per statement instead of
-- per row, improving query performance at scale.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Apply in Supabase SQL editor after all previous patches.
-- -----------------------------------------------------------------------------

-- 1) Fix helper functions (used by many policies)
create or replace function public.is_portal_member()
returns boolean
language sql
stable
as $$
  select
    exists (select 1 from public.portal_members pm where pm.user_id = (select auth.uid()))
    or exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = (select auth.uid()) and pm.role in ('admin','manager')
    )
    or exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
    );
$$;

-- 2) admin_users
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

-- 3) portal_members
drop policy if exists "portal_members_self_read" on public.portal_members;
create policy "portal_members_self_read"
on public.portal_members for select to authenticated
using (user_id = (select auth.uid()));

-- 4) campaigns
drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns for all to authenticated
using (
  (select public.is_portal_member())
  and (created_by = (select auth.uid()) or (select public.is_admin()))
)
with check (
  (select public.is_portal_member())
  and (created_by = (select auth.uid()) or (select public.is_admin()))
);

-- 5) contestants
drop policy if exists "contestants_owner_write" on public.contestants;
create policy "contestants_owner_write"
on public.contestants for insert to authenticated
with check (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = (select auth.uid())
    )
  )
);

drop policy if exists "contestants_owner_update" on public.contestants;
create policy "contestants_owner_update"
on public.contestants for update to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = (select auth.uid())
    )
  )
)
with check (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = (select auth.uid())
    )
  )
);

drop policy if exists "contestants_owner_delete" on public.contestants;
create policy "contestants_owner_delete"
on public.contestants for delete to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = (select auth.uid())
    )
  )
);

-- 6) transactions
drop policy if exists "transactions_owner_read" on public.transactions;
create policy "transactions_owner_read"
on public.transactions for select to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.campaigns c
      where c.id = transactions.campaign_id and c.created_by = (select auth.uid())
    )
  )
);

-- 7) votes
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes for select to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (select 1 from public.campaigns c where c.id = votes.campaign_id and c.created_by = (select auth.uid()))
  )
);

-- 8) tickets
drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets for select to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (select 1 from public.campaigns c where c.id = tickets.campaign_id and c.created_by = (select auth.uid()))
  )
);

-- 9) ticket_issues
drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues for select to authenticated
using (
  (select public.is_portal_member())
  and (
    (select public.is_admin())
    or exists (select 1 from public.campaigns c where c.id = ticket_issues.campaign_id and c.created_by = (select auth.uid()))
  )
);

-- 10) fusion_events
drop policy if exists "fusion_events_portal_insert" on public.fusion_events;
create policy "fusion_events_portal_insert"
on public.fusion_events for insert
with check (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = (select auth.uid())
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

drop policy if exists "fusion_events_portal_update" on public.fusion_events;
create policy "fusion_events_portal_update"
on public.fusion_events for update
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = (select auth.uid())
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
)
with check (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = (select auth.uid())
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

drop policy if exists "fusion_events_portal_delete" on public.fusion_events;
create policy "fusion_events_portal_delete"
on public.fusion_events for delete
using (
  exists (
    select 1 from public.portal_members pm
    where pm.user_id = (select auth.uid())
      and (pm.role in ('admin','manager')
           or (pm.role = 'client' and pm.features ? 'events'))
  )
);

-- 11) campaign_stats view (uses auth.uid())
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
where (select public.is_portal_member()) and ((select public.is_admin()) or c.created_by = (select auth.uid()))
group by c.id;
