-- Fusion Xpress: dropshipping fields on the shop catalog.
-- Supplier products (AliExpress affiliate search) are stored as normal
-- merchandise_items so checkout, cart, and the public shop stay on this site.

alter table public.merchandise_items
  add column if not exists source text not null default 'catalog',
  add column if not exists source_product_id text,
  add column if not exists source_url text,
  add column if not exists rating numeric(3,1),
  add column if not exists review_count integer not null default 0,
  add column if not exists orders_count integer not null default 0,
  add column if not exists gallery_urls text[] not null default '{}'::text[];

alter table public.merchandise_items drop constraint if exists merchandise_items_source_check;
alter table public.merchandise_items
  add constraint merchandise_items_source_check
  check (source in ('catalog', 'aliexpress'));

alter table public.merchandise_items drop constraint if exists merchandise_items_source_pid_key;
alter table public.merchandise_items
  add constraint merchandise_items_source_pid_key unique (source, source_product_id);

comment on column public.merchandise_items.source is 'catalog = added in the dashboard. aliexpress = imported from the affiliate catalog.';
comment on column public.merchandise_items.source_product_id is 'Supplier product id. Null for catalog items.';
comment on column public.merchandise_items.source_url is 'Supplier product page used by staff to place the order after payment. Not shown as a buy link.';
comment on column public.merchandise_items.gallery_urls is 'Extra product images. The primary photo stays in image_url.';

do $$ begin raise notice 'Merchandise dropship columns added.'; end $$;
