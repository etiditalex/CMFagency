-- Let clients see campaigns (and reports) for events they own.
-- When a campaign slug matches an event's ticket_campaign_slug or any ticket_tiers[].slug
-- and that event has created_by = current user, the client can see the campaign and its stats.
-- Apply after patch_43.
-- -----------------------------------------------------------------------------

-- Helper: true if campaign c is "owned" by current user via fusion_events (event created_by = auth.uid())
create or replace function public.campaign_visible_by_event_owner(c public.campaigns)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1 from public.fusion_events e
    where e.created_by = auth.uid()
      and (
        e.ticket_campaign_slug is not null and lower(trim(e.ticket_campaign_slug)) = lower(c.slug)
        or (
          e.ticket_tiers is not null
          and (select bool_or(lower(trim(coalesce(elem->>'slug', ''))) = lower(c.slug)) from jsonb_array_elements(e.ticket_tiers) elem)
        )
      )
  );
$$;

-- campaigns: portal members can SELECT campaigns they own OR campaigns linked to their events
drop policy if exists "campaigns_owner_all" on public.campaigns;
create policy "campaigns_owner_all"
on public.campaigns
for all
to authenticated
using (
  public.is_portal_member()
  and (
    created_by = auth.uid()
    or public.is_admin()
    or public.campaign_visible_by_event_owner(campaigns)
  )
)
with check (
  public.is_portal_member()
  and (created_by = auth.uid() or public.is_admin())
);

-- transactions: allow read when campaign is owned by user or linked to user's event
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
      where c.id = transactions.campaign_id
        and (c.created_by = auth.uid() or public.campaign_visible_by_event_owner(c))
    )
  )
);

-- votes: allow read when campaign is owned by user or linked to user's event
drop policy if exists "votes_owner_read" on public.votes;
create policy "votes_owner_read"
on public.votes
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = votes.campaign_id and (c.created_by = auth.uid() or public.campaign_visible_by_event_owner(c))
    )
  )
);

-- ticket_issues: allow read when campaign is owned by user or linked to user's event
drop policy if exists "ticket_issues_owner_read" on public.ticket_issues;
create policy "ticket_issues_owner_read"
on public.ticket_issues
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = ticket_issues.campaign_id and (c.created_by = auth.uid() or public.campaign_visible_by_event_owner(c))
    )
  )
);

-- tickets: allow read when campaign is owned by user or linked to user's event
drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read"
on public.tickets
for select
to authenticated
using (
  public.is_portal_member()
  and (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = tickets.campaign_id and (c.created_by = auth.uid() or public.campaign_visible_by_event_owner(c))
    )
  )
);

-- campaign_stats: include campaigns linked to user's events
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
where (select public.is_portal_member())
  and (
    (select public.is_admin())
    or c.created_by = (select auth.uid())
    or (select public.campaign_visible_by_event_owner(c))
  )
group by c.id;
