-- Fusion Xpress: managed editable pages for public routes.
-- Stores content blocks so admins can edit Careers/Services pages from the dashboard.

create table if not exists public.fusion_managed_pages (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  section text not null check (section in ('services','careers')),
  title text not null default '',
  hero_label text not null default '',
  description text not null default '',
  features_title text not null default '',
  features jsonb not null default '[]'::jsonb,
  benefits_title text not null default '',
  benefits jsonb not null default '[]'::jsonb,
  cta_title text not null default '',
  cta_description text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.fusion_managed_pages is
  'Admin-editable managed content for selected public routes (Careers/Services).';

-- RLS: allow public SELECT for rendering, but keep writes for admins/managers.
alter table public.fusion_managed_pages enable row level security;

drop policy if exists "fusion_managed_pages_select_public" on public.fusion_managed_pages;
create policy "fusion_managed_pages_select_public"
  on public.fusion_managed_pages
  for select
  to anon
  using (true);

-- No insert/update/delete policies for anon; dashboard uses service role/admin auth.

