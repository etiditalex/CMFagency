-- Fusion Xpress: Blogs management for /blogs and /blogs/[slug]
-- -----------------------------------------------------------------------------
-- Admins create/edit blogs from the dashboard. Public can read published posts.
-- Apply in Supabase SQL editor after patch_17 (or any patch that has set_updated_at).
-- -----------------------------------------------------------------------------

create table if not exists public.fusion_blogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  body text,
  author text default 'Changer Fusions Team',
  image_url text,
  category text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint fusion_blogs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fusion_blogs_slug_uniq unique (slug)
);

create index if not exists fusion_blogs_published_at_idx on public.fusion_blogs(published_at desc nulls last);
create index if not exists fusion_blogs_created_by_idx on public.fusion_blogs(created_by);

alter table public.fusion_blogs enable row level security;

-- Public read: only published posts (published_at is not null)
drop policy if exists "fusion_blogs_public_read" on public.fusion_blogs;
create policy "fusion_blogs_public_read"
  on public.fusion_blogs for select
  using (published_at is not null);

-- Admins/managers can do everything (insert, update, delete, and select drafts)
drop policy if exists "fusion_blogs_admin_all" on public.fusion_blogs;
create policy "fusion_blogs_admin_all"
  on public.fusion_blogs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.fusion_blogs to anon, authenticated;
grant insert, update, delete on table public.fusion_blogs to authenticated;

drop trigger if exists set_fusion_blogs_updated_at on public.fusion_blogs;
create trigger set_fusion_blogs_updated_at
  before update on public.fusion_blogs
  for each row execute function public.set_updated_at();

comment on table public.fusion_blogs is 'Blog posts managed from Fusion Xpress dashboard; public sees only published.';

do $$ begin raise notice 'Fusion blogs table created.'; end $$;
