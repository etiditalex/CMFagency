-- Fusion Xpress: publish polls live and record one public vote per browser.
-- Apply in the Supabase SQL editor after patch 96.
-- New polls default to Live. Each public vote increments the candidate and is stored once per voter key.

alter table public.fusion_polls alter column status set default 'Live';

create table if not exists public.fusion_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references public.fusion_polls(id) on delete cascade,
  option_id uuid not null references public.fusion_poll_options(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  constraint fusion_poll_votes_voter_len check (char_length(voter_key) between 8 and 80),
  constraint fusion_poll_votes_once unique (poll_id, voter_key)
);

create index if not exists fusion_poll_votes_poll_idx on public.fusion_poll_votes(poll_id, created_at desc);

alter table public.fusion_poll_votes enable row level security;

drop policy if exists "fusion_poll_votes_admin_all" on public.fusion_poll_votes;
create policy "fusion_poll_votes_admin_all" on public.fusion_poll_votes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.fusion_poll_votes to authenticated;

create or replace function public.cast_fusion_poll_vote(p_poll_id text, p_option_id uuid, p_voter_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_voter_key is null or char_length(p_voter_key) < 8 or char_length(p_voter_key) > 80 then
    return jsonb_build_object('ok', false, 'error', 'That vote could not be recorded.');
  end if;

  select status into v_status from public.fusion_polls where id = p_poll_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'This poll is not available.');
  end if;
  if v_status <> 'Live' then
    return jsonb_build_object(
      'ok', false,
      'error', case when v_status = 'Scheduled' then 'This poll is not open yet.' else 'This poll has ended.' end
    );
  end if;

  if not exists (
    select 1 from public.fusion_poll_options where id = p_option_id and poll_id = p_poll_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'That choice is not on this poll.');
  end if;

  begin
    insert into public.fusion_poll_votes (poll_id, option_id, voter_key)
    values (p_poll_id, p_option_id, p_voter_key);
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'already', true);
  end;

  update public.fusion_poll_options
  set votes = votes + 1
  where id = p_option_id and poll_id = p_poll_id;

  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

revoke all on function public.cast_fusion_poll_vote(text, uuid, text) from public, anon, authenticated;
grant execute on function public.cast_fusion_poll_vote(text, uuid, text) to service_role;

do $$
begin
  alter publication supabase_realtime add table public.fusion_poll_options;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.fusion_poll_votes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
