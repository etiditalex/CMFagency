-- Portal 2FA: Google Authenticator (TOTP). Admins can verify with email code or authenticator app.

create table if not exists public.portal_user_totp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  secret text not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

comment on table public.portal_user_totp is 'TOTP secrets for portal 2FA (Google Authenticator). Only backend reads via service_role.';

alter table public.portal_user_totp enable row level security;
revoke all on public.portal_user_totp from anon, authenticated;
grant select, insert, update, delete on public.portal_user_totp to service_role;
