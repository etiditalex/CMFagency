-- Lets the dashboard edit Registration and Volunteers, the first cards on /forms.
-- Apply after patch_104. Safe to run more than once.

alter table public.fusion_forms
  add column if not exists link_href text;

comment on column public.fusion_forms.link_href is
  'Optional site path the public card opens, such as /events/registration. Empty uses /forms/[slug].';

drop policy if exists "fusion_forms_public_read" on public.fusion_forms;
create policy "fusion_forms_public_read"
  on public.fusion_forms for select
  using (
    published_at is not null
    or slug in ('registration', 'volunteers')
  );

insert into public.fusion_forms (
  slug, title, excerpt, intro, image_url, category, fields, link_href, published_at, created_at
)
values
  (
    'registration',
    'Registration',
    'Apply for Kenya’s Ideal Mr & Miss 2026. Theme: Models for Education. 12 December 2026 at Malaika Lounge, Malindi.',
    'Contestant application for Kenya’s Ideal Mr & Miss 2026. The card on the Forms page opens this application.',
    'https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg',
    'Registration',
    '[]'::jsonb,
    '/events/registration',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z'
  ),
  (
    'volunteers',
    'Volunteers',
    'Apply to volunteer as a Regional or County Representative for the Kenya Fashion and Creative Arts Awards, organised by Changer Fusions.',
    'Regional and county representative application for the Kenya Fashion and Creative Arts Awards. The card on the Forms page opens this application.',
    'https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg',
    'Volunteer',
    '[]'::jsonb,
    '/events/volunteers',
    '2026-01-02T00:00:00Z',
    '2026-01-02T00:00:00Z'
  )
on conflict (slug) do nothing;

do $$ begin raise notice 'Fusion starter forms ready.'; end $$;
