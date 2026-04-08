-- Fusion Xpress: merchandise variants (sizes + colors)
-- Adds selectable options to merchandise_items.

alter table public.merchandise_items
  add column if not exists available_sizes text[] not null default '{}'::text[],
  add column if not exists available_colors text[] not null default '{}'::text[];

comment on column public.merchandise_items.available_sizes is 'Allowed sizes for this item (e.g. SMALL, MEDIUM, LARGE, XL, XXL). Empty means no size choice.';
comment on column public.merchandise_items.available_colors is 'Allowed colors for this item (e.g. Black, White). Empty means no color choice.';

-- Optional seed defaults for apparel.
update public.merchandise_items
set available_sizes = array['SMALL','MEDIUM','LARGE','XL','XXL'],
    available_colors = array['Black','White','Navy','Grey']
where category in ('T-Shirts','Hoodies') and (available_sizes = '{}'::text[] or available_colors = '{}'::text[]);

do $$ begin raise notice 'Merchandise variants columns added.'; end $$;

