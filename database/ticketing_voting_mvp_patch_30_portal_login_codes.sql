-- Portal login 2FA: store one-time codes sent by email after password sign-in.
-- After entering email+password, a 6-digit code is sent via Resend; user must enter it to reach the dashboard.

create table if not exists public.portal_login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_login_codes_user_id on public.portal_login_codes(user_id);
create index if not exists idx_portal_login_codes_expires_at on public.portal_login_codes(expires_at);

alter table public.portal_login_codes enable row level security;

-- Only service role (backend) should insert/select/delete; no client access.
-- Revoke from anon and authenticated so only service_role (bypasses RLS) can use the table.
revoke all on public.portal_login_codes from anon, authenticated;
grant select, insert, delete on public.portal_login_codes to service_role;

comment on table public.portal_login_codes is 'One-time codes for portal 2FA; sent by email after password sign-in.';
