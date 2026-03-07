-- Fusion Blogs: external_links for backlinks / references (SEO)
-- -----------------------------------------------------------------------------
-- Add optional list of outbound links to other sites (e.g. sources, further reading).
-- Apply after patch_24 (fusion_blogs).
-- -----------------------------------------------------------------------------

alter table public.fusion_blogs
  add column if not exists external_links jsonb default '[]'::jsonb;

comment on column public.fusion_blogs.external_links is 'Optional list of { "label": "Source name", "url": "https://..." } for references/backlinks.';

do $$ begin raise notice 'fusion_blogs.external_links added.'; end $$;
