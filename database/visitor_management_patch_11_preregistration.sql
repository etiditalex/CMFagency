-- Fusion Xpress — Visitor pre-registration & arrival QR verification (Patch 11)
-- -----------------------------------------------------------------------------
-- Adds device binding + contact verification for guests who register before
-- they arrive, then scan the reception QR on the same phone.
-- Apply in Supabase SQL Editor after visitor_management_patch_01.sql.
-- -----------------------------------------------------------------------------

alter table public.visitors
  add column if not exists registered_device_id text,
  add column if not exists device_label text;

comment on column public.visitors.registered_device_id is
  'Browser device id captured during public pre-registration; used to verify the arrival QR scan.';
comment on column public.visitors.device_label is
  'Human-readable device label (e.g. Android device) captured at pre-registration.';

do $$
begin
  alter table public.visitors drop constraint if exists visitors_source_check;
exception
  when undefined_object then null;
end $$;

alter table public.visitors
  drop constraint if exists visitors_source_check;

alter table public.visitors
  add constraint visitors_source_check
  check (source in ('dashboard', 'demo_form', 'kiosk', 'api', 'preregister'));

create index if not exists visitors_owner_device_idx
  on public.visitors (owner_id, registered_device_id)
  where registered_device_id is not null;

create index if not exists visitors_owner_phone_idx
  on public.visitors (owner_id, phone_number);

create index if not exists visitors_owner_source_idx
  on public.visitors (owner_id, source, visit_date desc);
