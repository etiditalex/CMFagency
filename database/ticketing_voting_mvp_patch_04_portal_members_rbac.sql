-- CMF Agency - Ticketing/Voting MVP patch 04 (Portal members + RBAC)
-- -----------------------------------------------------------------------------
-- Goal:
-- - Allow CLIENT users to access the portal dashboard, but only see their own data.
-- - Allow ADMIN users to access all portal data + admin-only features.
-- - Prevent normal site/job-applicant users from accessing the portal unless explicitly added.
--
-- Model:
-- - `portal_members`: who is allowed into the portal + their role.
-- - `admin_users`: legacy allowlist (kept for compatibility). `is_admin()` checks both.
--
-- How to add someone to the portal:
--   insert into public.portal_members (user_id, role) values ('<auth.users.id uuid>', 'client');
--
-- How to make someone an admin:
--   insert into public.portal_members (user_id, role) values ('<auth.users.id uuid>', 'admin')
--   on conflict (user_id) do update set role='admin';
--   insert into public.admin_users (user_id) values ('<auth.users.id uuid>') on conflict do nothing;
-- -----------------------------------------------------------------------------

-- 1) Portal membership table
create table if not exists public.portal_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

alter table public.portal_members enable row level security;

-- Allow a signed-in user to read THEIR own membership row (used by portal UI).
drop policy if exists "portal_members_self_read" on public.portal_members;
create policy "portal_members_self_read"
on public.portal_members
for select
to authenticated
using (user_id = auth.uid());

-- No client-side writes; portal members are seeded via SQL editor / service role.
revoke insert, update, delete on public.portal_members from anon, authenticated;
grant select on table public.portal_members to authenticated;

-- 2) Helper functions
create or replace function public.is_portal_member()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.portal_members pm
    where pm.user_id = auth.uid()
  );
$$;

-- Expand `is_admin()` to also accept portal_members.role='admin' (keeps backwards compatibility).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1 from public.portal_members pm
      where pm.user_id = auth.uid() and pm.role = 'admin'
    )
    or exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    );
$$;

-- 3) RLS policies (portal member = own access, admin = global access)

-- campaigns: portal members can manage their own campaigns; admins can manage all
drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns
for all
to authenticated
using (
  public.is_portal_member()
  and (created_by = auth.uid() or public.is_admin())
)
with check (
  public.is_portal_member()
  and (created_by = auth.uid() or public.is_admin())
);

-- contestants: portal members can manage contestants under their campaigns; admins can manage all
drop policy if exists "contestants_owner_write" on public.contestants;
create policy "contestants_owner_write"
on public.contestants
for insert
to authenticated
with check (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = auth.uid()
    )
  )
);

drop policy if exists "contestants_owner_update" on public.contestants;
create policy "contestants_owner_update"
on public.contestants
for update
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = auth.uid()
    )
  )
)
with check (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = auth.uid()
    )
  )
);

drop policy if exists "contestants_owner_delete" on public.contestants;
create policy "contestants_owner_delete"
on public.contestants
for delete
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = contestants.campaign_id and c.created_by = auth.uid()
    )
  )
);

-- transactions: portal members can read their campaign transactions; admins can read all
drop policy if exists "transactions_owner_read" on public.transactions;
create policy "transactions_owner_read"
on public.transactions
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = transactions.campaign_id and c.created_by = auth.uid()
    )
  )
);

-- votes/tickets/ticket_issues: portal members can read fulfillment for their campaigns; admins can read all
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (select 1 from public.campaigns c where c.id = votes.campaign_id and c.created_by = auth.uid())
  )
);

drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (select 1 from public.campaigns c where c.id = tickets.campaign_id and c.created_by = auth.uid())
  )
);

drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (select 1 from public.campaigns c where c.id = ticket_issues.campaign_id and c.created_by = auth.uid())
  )
);

-- campaign_stats view: allow portal members to see their own stats; admins see all stats.
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
where public.is_portal_member() and (public.is_admin() or c.created_by = auth.uid())
group by c.id;

