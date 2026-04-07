-- Fusion Xpress: Gallery images (used for /portfolios and homepage gallery carousel)
-- Public reads active rows; admins/managers (is_admin()) can manage all rows.

create table if not exists public.gallery_images (
  id serial primary key,
  title text not null default '',
  image_url text not null,
  category text not null default 'General',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_images_active_sort_idx
  on public.gallery_images (is_active, is_featured, sort_order, id);

comment on table public.gallery_images is
  'Public gallery images managed from Fusion Xpress dashboard.';

alter table public.gallery_images enable row level security;

drop policy if exists "gallery_images_select" on public.gallery_images;
create policy "gallery_images_select"
  on public.gallery_images
  for select
  using (
    is_active = true
    or (select public.is_admin())
  );

drop policy if exists "gallery_images_admin_insert" on public.gallery_images;
create policy "gallery_images_admin_insert"
  on public.gallery_images
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "gallery_images_admin_update" on public.gallery_images;
create policy "gallery_images_admin_update"
  on public.gallery_images
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "gallery_images_admin_delete" on public.gallery_images;
create policy "gallery_images_admin_delete"
  on public.gallery_images
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on table public.gallery_images to anon, authenticated;
grant insert, update, delete on table public.gallery_images to authenticated;

drop trigger if exists set_gallery_images_updated_at on public.gallery_images;
create trigger set_gallery_images_updated_at
  before update on public.gallery_images
  for each row execute function public.set_updated_at();

do $$ begin raise notice 'Gallery images table created.'; end $$;

