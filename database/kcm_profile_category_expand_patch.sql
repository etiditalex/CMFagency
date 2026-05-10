-- Expand kcm_member_profiles.profile_category to match KCM registration fashion choices.
-- Run once on Supabase SQL editor if your constraint only allowed high_fashion_model / pageant_model.

alter table public.kcm_member_profiles
  drop constraint if exists kcm_member_profiles_category_check;

alter table public.kcm_member_profiles
  drop constraint if exists kcm_member_profiles_profile_category_check;

alter table public.kcm_member_profiles
  add constraint kcm_member_profiles_category_check
  check (
    profile_category = any (
      array[
        'model'::text,
        'event_organizer'::text,
        'designer'::text,
        'other'::text,
        'high_fashion_model'::text,
        'pageant_model'::text
      ]
    )
  );
