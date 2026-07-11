-- Make nominator fields optional (public form collects nominee details only).
-- Apply in Supabase SQL Editor after patch_81.
-- -----------------------------------------------------------------------------

alter table public.model_nominations
  alter column nominator_name drop not null;

alter table public.model_nominations
  alter column nominator_email drop not null;

comment on column public.model_nominations.nominator_name is
  'Optional; public nominate form no longer collects nominator details.';

comment on column public.model_nominations.nominator_email is
  'Optional; public nominate form no longer collects nominator details.';
