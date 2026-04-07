-- Fusion Xpress: merchandise catalog for /merchandise and dashboard CRUD.
-- Public reads active rows; admins/managers (is_admin()) can manage all rows.

create table if not exists public.merchandise_items (
  id serial primary key,
  name text not null,
  price_kes integer not null check (price_kes >= 0),
  original_price_kes integer check (original_price_kes is null or original_price_kes >= 0),
  short_description text not null default '',
  image_url text not null,
  category text not null default 'General',
  in_stock boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchandise_items_active_sort_idx
  on public.merchandise_items (is_active, sort_order, id);

comment on table public.merchandise_items is
  'Storefront merchandise; managed from Fusion Xpress dashboard.';

alter table public.merchandise_items enable row level security;

drop policy if exists "merchandise_items_select" on public.merchandise_items;
create policy "merchandise_items_select"
  on public.merchandise_items
  for select
  using (
    is_active = true
    or (select public.is_admin())
  );

drop policy if exists "merchandise_items_admin_insert" on public.merchandise_items;
create policy "merchandise_items_admin_insert"
  on public.merchandise_items
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "merchandise_items_admin_update" on public.merchandise_items;
create policy "merchandise_items_admin_update"
  on public.merchandise_items
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "merchandise_items_admin_delete" on public.merchandise_items;
create policy "merchandise_items_admin_delete"
  on public.merchandise_items
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on table public.merchandise_items to anon, authenticated;
grant insert, update, delete on table public.merchandise_items to authenticated;

drop trigger if exists set_merchandise_items_updated_at on public.merchandise_items;
create trigger set_merchandise_items_updated_at
  before update on public.merchandise_items
  for each row execute function public.set_updated_at();

-- Seed existing demo products so ids stay stable for carts (1–4).
insert into public.merchandise_items (
  id, name, price_kes, original_price_kes, short_description, image_url, category, in_stock, is_active, sort_order
) values
(
  1,
  'Changer Fusions Classic T-Shirt',
  2500,
  null,
  'Premium quality cotton t-shirt with Changer Fusions branding. Comfortable fit for everyday wear.',
  'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/t-shirts_hm50aj.jpg',
  'T-Shirts',
  true,
  true,
  0
),
(
  2,
  'Changer Fusions Water Bottle',
  1500,
  null,
  'Eco-friendly stainless steel water bottle with Changer Fusions logo. Keeps drinks cold for 24 hours or hot for 12 hours.',
  'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/water_bottle_it6dhy.jpg',
  'Water Bottles',
  true,
  true,
  1
),
(
  3,
  'Changer Fusions Classic Hoodie',
  4500,
  null,
  'Comfortable hoodie perfect for casual wear. Features Changer Fusions branding and soft fleece interior.',
  'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/hoodie_hwkw2l.jpg',
  'Hoodies',
  true,
  true,
  2
),
(
  4,
  'Changer Fusions Key Holder',
  800,
  null,
  'Premium key holder with Changer Fusions logo. Durable and stylish design.',
  'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/Key_holder_nkhf6x.jpg',
  'Key Holders',
  true,
  true,
  3
)
on conflict (id) do nothing;

select setval(
  pg_get_serial_sequence('public.merchandise_items', 'id'),
  coalesce((select max(id) from public.merchandise_items), 1)
);

do $$ begin raise notice 'Merchandise items table created.'; end $$;
