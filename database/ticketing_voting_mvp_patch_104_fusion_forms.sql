-- Fusion Xpress forms for the public /forms page.
-- Admins create forms in the dashboard. Visitors only see published forms.
-- Submissions are inserted by the server and reviewed by admins.
-- Apply in the Supabase SQL editor after patch_24 (is_admin and set_updated_at).

create table if not exists public.fusion_forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  intro text,
  image_url text,
  category text,
  fields jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fusion_forms_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fusion_forms_slug_uniq unique (slug),
  constraint fusion_forms_fields_array check (jsonb_typeof(fields) = 'array')
);

create index if not exists fusion_forms_published_at_idx
  on public.fusion_forms (published_at desc nulls last);
create index if not exists fusion_forms_created_by_idx
  on public.fusion_forms (created_by);

create table if not exists public.fusion_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.fusion_forms (id) on delete cascade,
  submission_code text not null,
  submitter_name text,
  submitter_email text,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint fusion_form_submissions_code_uniq unique (submission_code),
  constraint fusion_form_submissions_status_chk check (
    status in ('new', 'reviewed', 'shortlisted', 'rejected')
  ),
  constraint fusion_form_submissions_answers_array check (jsonb_typeof(answers) = 'array')
);

create index if not exists fusion_form_submissions_form_id_idx
  on public.fusion_form_submissions (form_id, created_at desc);
create index if not exists fusion_form_submissions_created_at_idx
  on public.fusion_form_submissions (created_at desc);

alter table public.fusion_forms enable row level security;
alter table public.fusion_form_submissions enable row level security;

drop policy if exists "fusion_forms_public_read" on public.fusion_forms;
create policy "fusion_forms_public_read"
  on public.fusion_forms for select
  using (published_at is not null);

drop policy if exists "fusion_forms_admin_all" on public.fusion_forms;
create policy "fusion_forms_admin_all"
  on public.fusion_forms for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "fusion_form_submissions_admin_select" on public.fusion_form_submissions;
create policy "fusion_form_submissions_admin_select"
  on public.fusion_form_submissions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "fusion_form_submissions_admin_update" on public.fusion_form_submissions;
create policy "fusion_form_submissions_admin_update"
  on public.fusion_form_submissions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.fusion_forms to anon, authenticated;
grant insert, update, delete on table public.fusion_forms to authenticated;

revoke insert, update, delete on table public.fusion_form_submissions from anon, authenticated;
grant select on table public.fusion_form_submissions to authenticated;
grant update (status) on table public.fusion_form_submissions to authenticated;
grant select, insert, update, delete on table public.fusion_form_submissions to service_role;

drop trigger if exists set_fusion_forms_updated_at on public.fusion_forms;
create trigger set_fusion_forms_updated_at
  before update on public.fusion_forms
  for each row execute function public.set_updated_at();

comment on table public.fusion_forms is
  'Forms managed from Fusion Xpress. Public /forms shows published rows only.';
comment on table public.fusion_form_submissions is
  'Answers submitted on a published Fusion form. Admins review them in the dashboard.';

do $$ begin raise notice 'Fusion forms tables created.'; end $$;
