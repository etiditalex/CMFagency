-- Lets Fusion Xpress edit the page copy on forms that already exist.
-- Null keeps the built-in copy. A saved array replaces it, so sections can be added or removed.
-- Apply after patch_105. Safe to run more than once.

alter table public.fusion_forms
  add column if not exists content jsonb;

alter table public.fusion_forms
  drop constraint if exists fusion_forms_content_array;

alter table public.fusion_forms
  add constraint fusion_forms_content_array
  check (content is null or jsonb_typeof(content) = 'array');

comment on column public.fusion_forms.content is
  'Page sections for a form. Null keeps the built-in copy. An array replaces it.';

do $$ begin raise notice 'Fusion form content column ready.'; end $$;
