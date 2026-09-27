-- Application fee for Kenya's Ideal Mr & Miss. Edited from Fusion Xpress → Registrations.
-- Public reads go through the service-role API. Default is KES 500.

create table if not exists public.ideal_mr_miss_settings (
  id smallint primary key default 1 constraint ideal_mr_miss_settings_singleton check (id = 1),
  application_fee_kes integer not null default 500 check (application_fee_kes >= 1 and application_fee_kes <= 1000000),
  updated_at timestamptz not null default now()
);

insert into public.ideal_mr_miss_settings (id, application_fee_kes)
values (1, 500)
on conflict (id) do nothing;

comment on table public.ideal_mr_miss_settings is
  'Singleton settings for Kenya''s Ideal Mr & Miss, including the application fee in KES.';

alter table public.ideal_mr_miss_settings enable row level security;

drop policy if exists "ideal_mr_miss_settings_admin_select" on public.ideal_mr_miss_settings;
create policy "ideal_mr_miss_settings_admin_select"
on public.ideal_mr_miss_settings
for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on public.ideal_mr_miss_settings from anon, authenticated;
grant select on public.ideal_mr_miss_settings to authenticated;
grant select, insert, update, delete on public.ideal_mr_miss_settings to service_role;
