-- Fusion Xpress — Employee module: WhatsApp on notification admins (Patch 17)
-- Run after visitor_employees_patch_02_notification_admins.sql
-- -----------------------------------------------------------------------------

alter table public.visitor_employee_notification_admins
  add column if not exists whatsapp_phone text not null default '',
  add column if not exists notify_whatsapp boolean not null default true;

comment on column public.visitor_employee_notification_admins.whatsapp_phone is
  'E.164-style digits only (e.g. 254712345678). When set and notify_whatsapp is true, attendance register alerts are sent via WhatsApp Cloud API.';
comment on column public.visitor_employee_notification_admins.notify_whatsapp is
  'When true and whatsapp_phone is set, send attendance register WhatsApp alerts for enabled sign-in/sign-out events.';

notify pgrst, 'reload schema';
