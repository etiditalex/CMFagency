-- Contestants: store email and when voting link was sent (for "Register as a Model" flow).
-- Run after: ticketing_voting_mvp.sql and any contestant-related patches.

alter table public.contestants
  add column if not exists email text,
  add column if not exists voting_link_sent_at timestamptz;

comment on column public.contestants.email is 'Contestant email (e.g. from model registration); used to send voting campaign link.';
comment on column public.contestants.voting_link_sent_at is 'When the voting campaign link was emailed to this contestant.';
