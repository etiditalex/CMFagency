-- Model nominations (CFMA Top 10 Male / Female)
-- Apply in Supabase SQL Editor after patch_80.
-- Public submits via service-role API; Fusion Xpress admins read/update via RLS.
-- -----------------------------------------------------------------------------

create table if not exists public.model_nominations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null default 'coast-fashion-modelling-awards-2026',
  nominator_name text not null,
  nominator_email text not null,
  nominator_phone text,
  nominee_name text not null,
  nominee_email text,
  nominee_phone text,
  nominee_instagram text,
  category text not null check (category in ('top_10_male', 'top_10_female')),
  reason text not null,
  status text not null default 'new' check (
    status in ('new', 'reviewed', 'shortlisted', 'rejected')
  ),
  source text not null default 'nominate_form',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists model_nominations_created_at_idx
  on public.model_nominations (created_at desc);

create index if not exists model_nominations_status_idx
  on public.model_nominations (status);

create index if not exists model_nominations_category_idx
  on public.model_nominations (category);

create index if not exists model_nominations_event_slug_idx
  on public.model_nominations (event_slug);

comment on table public.model_nominations is
  'Public model nominations for CFMA Top 10 Male/Female; managed in Fusion Xpress Nominate.';

alter table public.model_nominations enable row level security;

-- Admins/managers can read and update. Inserts come from API (service role).
drop policy if exists "model_nominations_admin_select" on public.model_nominations;
create policy "model_nominations_admin_select"
on public.model_nominations
for select
to authenticated
using (public.is_admin());

drop policy if exists "model_nominations_admin_update" on public.model_nominations;
create policy "model_nominations_admin_update"
on public.model_nominations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke insert, delete on public.model_nominations from anon, authenticated;
grant select, update on public.model_nominations to authenticated;
grant select, insert, update, delete on public.model_nominations to service_role;

drop trigger if exists set_model_nominations_updated_at on public.model_nominations;
create trigger set_model_nominations_updated_at
before update on public.model_nominations
for each row execute function public.set_updated_at();

-- Realtime for Fusion Xpress Nominate live feed
do $$
begin
  alter publication supabase_realtime add table public.model_nominations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
