-- CMF Agency - Ticketing/Voting MVP patch 02 (Admin allowlist)
-- -----------------------------------------------------------------------------
-- Problem:
-- - Your existing `/login` is used by job applicants (regular users).
-- - This module needs "admin-only" access for campaign creation + dashboard stats.
--
-- Solution (MVP):
-- - Add an `admin_users` allowlist table.
-- - Update RLS policies to require admin membership for admin operations.
-- - Public `/pay/[slug]` remains anonymous (no login).
--
-- How to make someone an admin:
--   insert into public.admin_users (user_id) values ('<auth.users.id uuid>');
-- -----------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Allow a signed-in user to check if THEY are an admin (needed by the dashboard UI).
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

-- No client-side writes; admins are seeded via SQL editor / service role.
revoke insert, update, delete on public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

-- Helper function used by RLS policies
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Tighten RLS for the module to admins-only for dashboard operations
-- -----------------------------------------------------------------------------

-- campaigns: only admins can create/update/delete their own campaigns
drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns
for all
to authenticated
using (created_by = auth.uid() and public.is_admin())
with check (created_by = auth.uid() and public.is_admin());

-- contestants: only admins can manage contestants under their campaigns
drop policy if exists "contestants_owner_write" on public.contestants;
create policy "contestants_owner_write"
on public.contestants
for insert
to authenticated
with check (
  public.is_admin()
  and exists (
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
  public.is_admin()
  and exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
)
with check (
  public.is_admin()
  and exists (
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
  public.is_admin()
  and exists (
    select 1 from public.campaigns c
    where c.id = contestants.campaign_id and c.created_by = auth.uid()
  )
);

-- transactions: only admins can read their campaign transactions (dashboard)
drop policy if exists "transactions_owner_read" on public.transactions;
create policy "transactions_owner_read"
on public.transactions
for select
to authenticated
using (
  public.is_admin()
  and exists (
    select 1 from public.campaigns c
    where c.id = transactions.campaign_id and c.created_by = auth.uid()
  )
);

-- votes/tickets/ticket_issues: only admins can read their own campaign fulfillment
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes
for select
to authenticated
using (public.is_admin() and exists (
  select 1 from public.campaigns c where c.id = votes.campaign_id and c.created_by = auth.uid()
));

drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets
for select
to authenticated
using (public.is_admin() and exists (
  select 1 from public.campaigns c where c.id = tickets.campaign_id and c.created_by = auth.uid()
));

drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues
for select
to authenticated
using (public.is_admin() and exists (
  select 1 from public.campaigns c where c.id = ticket_issues.campaign_id and c.created_by = auth.uid()
));

-- Make campaign_stats view "owner-scoped" so authenticated users cannot read global stats.
-- (Works because it filters by auth.uid(); anon users see zero rows.)
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
where c.created_by = auth.uid() and public.is_admin()
group by c.id;

