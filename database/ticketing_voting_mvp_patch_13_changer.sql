-- CMF Agency - Changer AI Chatbot
-- -----------------------------------------------------------------------------
-- Creates tables for the Changer chatbot: conversations, messages, knowledge base,
-- and live agent handoff log. Integrates with Fusion Xpress dashboard.
--
-- Run after ticketing_voting_mvp_patch_12_merchandise.sql (or any prior patch).
-- -----------------------------------------------------------------------------

-- Changer conversations (one per chat session)
create table if not exists public.changer_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  status text not null default 'bot' check (status in ('bot','waiting_for_agent','live_agent','ended')),
  live_agent_name text,
  live_agent_picked_at timestamptz,
  visitor_email text,
  visitor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists changer_conversations_session_idx
  on public.changer_conversations (session_id);
create index if not exists changer_conversations_status_idx
  on public.changer_conversations (status);
create index if not exists changer_conversations_created_idx
  on public.changer_conversations (created_at desc);

comment on table public.changer_conversations is 'Changer chatbot conversations; live agent handoff tracked for Fusion Xpress.';

-- Changer messages
create table if not exists public.changer_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.changer_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','live_agent')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists changer_messages_conversation_idx
  on public.changer_messages (conversation_id, created_at asc);

comment on table public.changer_messages is 'Chat messages within Changer conversations.';

-- Changer knowledge base (website content for AI learning)
create table if not exists public.changer_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_type text default 'page' check (source_type in ('page','blog','service','event','manual')),
  title text,
  content_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists changer_knowledge_source_idx
  on public.changer_knowledge (source_url);
create index if not exists changer_knowledge_updated_idx
  on public.changer_knowledge (updated_at desc);

comment on table public.changer_knowledge is 'Website content indexed for Changer AI to learn from.';

-- Changer handoff log (admin-only: when live agent Alex picks up)
create table if not exists public.changer_handoff_log (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.changer_conversations(id) on delete cascade,
  live_agent_name text not null default 'Alex',
  picked_by_user_id uuid references auth.users(id),
  picked_at timestamptz not null default now()
);

create index if not exists changer_handoff_log_conversation_idx
  on public.changer_handoff_log (conversation_id);

comment on table public.changer_handoff_log is 'Admin dashboard log of live agent handoffs (Alex). Not shown on public site.';

-- Enable RLS
alter table public.changer_conversations enable row level security;
alter table public.changer_messages enable row level security;
alter table public.changer_knowledge enable row level security;
alter table public.changer_handoff_log enable row level security;

-- Admins can read conversations and messages (for Changer dashboard)
drop policy if exists "changer_conversations_admin_select" on public.changer_conversations;
create policy "changer_conversations_admin_select"
  on public.changer_conversations for select
  to authenticated
  using (public.is_admin());

drop policy if exists "changer_messages_admin_select" on public.changer_messages;
create policy "changer_messages_admin_select"
  on public.changer_messages for select
  to authenticated
  using (public.is_admin());

grant select on public.changer_conversations to authenticated;
grant select on public.changer_messages to authenticated;

-- Knowledge: admins can manage from Fusion Xpress
drop policy if exists "changer_knowledge_admin_all" on public.changer_knowledge;
create policy "changer_knowledge_admin_all"
  on public.changer_knowledge for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Handoff log: admin-only read (Alex handoffs recorded in admin dashboard)
drop policy if exists "changer_handoff_log_admin_select" on public.changer_handoff_log;
create policy "changer_handoff_log_admin_select"
  on public.changer_handoff_log for select
  to authenticated
  using (public.is_admin());

-- Service role has full access (API uses service role)
grant all on public.changer_conversations to service_role;
grant all on public.changer_messages to service_role;
grant all on public.changer_knowledge to service_role;
grant all on public.changer_handoff_log to service_role;

-- Auto-update updated_at on conversations
create or replace function public.changer_conversations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists changer_conversations_updated_at on public.changer_conversations;
create trigger changer_conversations_updated_at
  before update on public.changer_conversations
  for each row execute function public.changer_conversations_updated_at();

do $$ begin raise notice 'Changer chatbot tables created.'; end $$;
