-- Forum attendance fees, editable on the Fusion Xpress KCM membership board.
-- Defaults match the original prices: members KES 200, new members KES 300.

alter table public.kcm_registration_settings
  add column if not exists forum_member_fee_kes integer not null default 200;

alter table public.kcm_registration_settings
  add column if not exists forum_non_member_fee_kes integer not null default 300;

alter table public.kcm_registration_settings
  drop constraint if exists kcm_registration_settings_forum_member_fee_check;

alter table public.kcm_registration_settings
  drop constraint if exists kcm_registration_settings_forum_non_member_fee_check;

alter table public.kcm_registration_settings
  add constraint kcm_registration_settings_forum_member_fee_check
  check (forum_member_fee_kes >= 1 and forum_member_fee_kes <= 1000000);

alter table public.kcm_registration_settings
  add constraint kcm_registration_settings_forum_non_member_fee_check
  check (forum_non_member_fee_kes >= 1 and forum_non_member_fee_kes <= 1000000);

-- Allow saved attendance amounts other than the original 200 / 300.
do $$
declare
  constraint_name text;
begin
  if to_regclass('public.kenya_coast_models_registrations') is null then
    return;
  end if;

  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.kenya_coast_models_registrations'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%fee_kes%'
  loop
    execute format(
      'alter table public.kenya_coast_models_registrations drop constraint %I',
      constraint_name
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'kenya_coast_models_registrations_fee_kes_range_check'
  ) then
    alter table public.kenya_coast_models_registrations
      add constraint kenya_coast_models_registrations_fee_kes_range_check
      check (fee_kes >= 1 and fee_kes <= 1000000);
  end if;
end $$;
