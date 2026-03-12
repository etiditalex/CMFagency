-- Security audit fixes (Supabase)
-- 1) campaign_stats: use SECURITY INVOKER so the view runs with the invoker's privileges
--    (avoids SECURITY DEFINER privilege escalation).
-- 2) public.users: enable RLS and restrict access to own row (and service role).

-- -----------------------------------------------------------------------------
-- 1) campaign_stats view — security invoker
-- -----------------------------------------------------------------------------
create or replace view public.campaign_stats
with (security_invoker = on)
as
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

-- -----------------------------------------------------------------------------
-- 2) public.users — enable RLS and policies
-- -----------------------------------------------------------------------------
alter table if exists public.users enable row level security;

-- Drop existing policies if re-running
drop policy if exists "users_own_row_select" on public.users;
drop policy if exists "users_own_row_update" on public.users;

-- Authenticated users can read and update only their own row (id = auth.uid())
create policy "users_own_row_select"
on public.users for select to authenticated
using (id = auth.uid());

create policy "users_own_row_update"
on public.users for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Service role (used by track-application API) bypasses RLS and can still read all rows.
