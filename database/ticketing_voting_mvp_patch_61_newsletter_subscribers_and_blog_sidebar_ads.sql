-- Newsletter list + blog sidebar promos (apply after patch_60)
-- -----------------------------------------------------------------------------

-- Subscribers: inserted only via API using SUPABASE_SERVICE_ROLE_KEY (RLS blocks direct client access).
create table if not exists public.fusion_newsletter_subscribers (
  email text primary key,
  subscribed_at timestamptz not null default now()
);

create index if not exists fusion_newsletter_subscribers_subscribed_at_idx
  on public.fusion_newsletter_subscribers (subscribed_at desc);

alter table public.fusion_newsletter_subscribers enable row level security;

comment on table public.fusion_newsletter_subscribers is
  'Public newsletter signups; /api/newsletter/subscribe upserts via service role. Used for new blog announcement emails.';

-- Sidebar ads: only rows with approved = true are readable by anon (public blog pages).
create table if not exists public.fusion_blog_sidebar_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  href text,
  approved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fusion_blog_sidebar_ads_approved_sort_idx
  on public.fusion_blog_sidebar_ads (approved desc, sort_order asc, created_at desc);

alter table public.fusion_blog_sidebar_ads enable row level security;

drop policy if exists "fusion_blog_sidebar_ads_public_read" on public.fusion_blog_sidebar_ads;
create policy "fusion_blog_sidebar_ads_public_read"
  on public.fusion_blog_sidebar_ads for select
  to anon, authenticated
  using (approved = true);

drop policy if exists "fusion_blog_sidebar_ads_admin_all" on public.fusion_blog_sidebar_ads;
create policy "fusion_blog_sidebar_ads_admin_all"
  on public.fusion_blog_sidebar_ads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.fusion_blog_sidebar_ads to anon, authenticated;
grant select, insert, update, delete on public.fusion_blog_sidebar_ads to authenticated;

drop trigger if exists set_fusion_blog_sidebar_ads_updated_at on public.fusion_blog_sidebar_ads;
create trigger set_fusion_blog_sidebar_ads_updated_at
  before update on public.fusion_blog_sidebar_ads
  for each row execute function public.set_updated_at();

comment on table public.fusion_blog_sidebar_ads is
  'Promotional blocks on /blogs/[slug] sidebar; Fusion Xpress admins create rows and set approved when ready.';

do $$ begin raise notice 'patch_61: fusion_newsletter_subscribers + fusion_blog_sidebar_ads applied.'; end $$;
