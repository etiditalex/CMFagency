-- CMF Agency - Changer handoff tracking for 2-min timeout
-- -----------------------------------------------------------------------------
-- Adds handoff_requested_at and agent_timeout_notified for live agent timeout flow.
-- Run after ticketing_voting_mvp_patch_13_changer.sql
-- -----------------------------------------------------------------------------

alter table public.changer_conversations
  add column if not exists handoff_requested_at timestamptz,
  add column if not exists agent_timeout_notified boolean not null default false;

comment on column public.changer_conversations.handoff_requested_at is 'When visitor requested live agent; used for 2-min timeout.';
comment on column public.changer_conversations.agent_timeout_notified is 'True after we notified visitor that agent is unavailable (WhatsApp/call fallback).';
