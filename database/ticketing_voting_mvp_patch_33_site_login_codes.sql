-- Main site login verification: 6-digit code sent by email after password sign-in.
-- Used for /login (not Fusion Xpress portal). User must enter code to complete login.

create table if not exists public.site_login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_login_codes_user_id on public.site_login_codes(user_id);
create index if not exists idx_site_login_codes_expires_at on public.site_login_codes(expires_at);

alter table public.site_login_codes enable row level security;

revoke all on public.site_login_codes from anon, authenticated;
grant select, insert, delete on public.site_login_codes to service_role;

comment on table public.site_login_codes is 'One-time codes for main site login 2FA; sent by email after password sign-in.';
