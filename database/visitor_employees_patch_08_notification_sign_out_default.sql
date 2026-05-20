-- Fusion Xpress — Employee notification admins: sign-out emails on by default (Patch 08)
-- Run after visitor_employees_patch_02_notification_admins.sql
-- -----------------------------------------------------------------------------

alter table public.visitor_employee_notification_admins
  alter column notify_sign_out set default true;

update public.visitor_employee_notification_admins
set notify_sign_out = true
where notify_sign_out = false;

notify pgrst, 'reload schema';
