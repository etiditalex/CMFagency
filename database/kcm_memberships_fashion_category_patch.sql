-- Registration fashion category (KCM public signup modal)

alter table public.kcm_memberships add column if not exists fashion_category text;
alter table public.kcm_memberships add column if not exists fashion_category_other text;

comment on column public.kcm_memberships.fashion_category is
  'Registration choice: model | event_organizer | designer | other';
comment on column public.kcm_memberships.fashion_category_other is
  'Free text when fashion_category is other';
