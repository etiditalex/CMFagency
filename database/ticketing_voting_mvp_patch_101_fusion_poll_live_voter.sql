-- Opinion live polls store the voter's name, email, and terms consent.
-- Polls created on /poll stay anonymous: those rows leave these columns null.
-- Apply in the Supabase SQL editor after patch 100.

alter table public.fusion_poll_votes
  add column if not exists voter_name text,
  add column if not exists voter_email text,
  add column if not exists terms_accepted_at timestamptz;

alter table public.fusion_poll_votes drop constraint if exists fusion_poll_votes_voter_name_len;
alter table public.fusion_poll_votes
  add constraint fusion_poll_votes_voter_name_len
  check (voter_name is null or char_length(voter_name) between 2 and 80);

alter table public.fusion_poll_votes drop constraint if exists fusion_poll_votes_voter_email_len;
alter table public.fusion_poll_votes
  add constraint fusion_poll_votes_voter_email_len
  check (voter_email is null or char_length(voter_email) between 6 and 120);

create unique index if not exists fusion_poll_votes_email_once
  on public.fusion_poll_votes (poll_id, voter_email)
  where voter_email is not null;

create or replace function public.cast_fusion_poll_live_vote(
  p_poll_id text,
  p_option_id uuid,
  p_voter_key text,
  p_voter_name text,
  p_voter_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_topic text;
  v_name text;
  v_email text;
begin
  if p_voter_key is null or char_length(p_voter_key) < 8 or char_length(p_voter_key) > 80 then
    return jsonb_build_object('ok', false, 'error', 'That vote could not be recorded.');
  end if;

  v_name := regexp_replace(btrim(coalesce(p_voter_name, '')), '\s+', ' ', 'g');
  v_email := lower(btrim(coalesce(p_voter_email, '')));
  if char_length(v_name) < 2 or char_length(v_name) > 80 or v_name ~ '[<>]' then
    return jsonb_build_object('ok', false, 'error', 'Enter your name to vote.');
  end if;
  if char_length(v_email) < 6 or char_length(v_email) > 120 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid email address to vote.');
  end if;

  select status, topic into v_status, v_topic
  from public.fusion_polls
  where id = p_poll_id;
  if v_status is null or v_topic is null or v_topic = 'poll' then
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

  if exists (
    select 1 from public.fusion_poll_votes where poll_id = p_poll_id and voter_key = p_voter_key
  ) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if exists (
    select 1 from public.fusion_poll_votes where poll_id = p_poll_id and voter_email = v_email
  ) then
    return jsonb_build_object('ok', false, 'error', 'This email has already been used to vote on this poll.');
  end if;

  begin
    insert into public.fusion_poll_votes (poll_id, option_id, voter_key, voter_name, voter_email, terms_accepted_at)
    values (p_poll_id, p_option_id, p_voter_key, v_name, v_email, now());
  exception when unique_violation then
    if exists (
      select 1 from public.fusion_poll_votes where poll_id = p_poll_id and voter_key = p_voter_key
    ) then
      return jsonb_build_object('ok', true, 'already', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'This email has already been used to vote on this poll.');
  end;

  update public.fusion_poll_options
  set votes = votes + 1
  where id = p_option_id and poll_id = p_poll_id;

  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

revoke all on function public.cast_fusion_poll_live_vote(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.cast_fusion_poll_live_vote(text, uuid, text, text, text) to service_role;
