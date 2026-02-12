-- CMF Agency - Ticketing/Voting MVP patch 09 (Inquiries)
-- -----------------------------------------------------------------------------
-- Goal: Store contact form inquiries so they appear in the Fusion Xpress
-- dashboard. Inquiries are saved when customers submit the contact form
-- (Option B: dashboard + WhatsApp).
--
-- Run after ticketing_voting_mvp_patch_08_vat.sql (or any prior patch).
-- -----------------------------------------------------------------------------

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied')),
  source text not null default 'contact_form' check (source in ('contact_form','whatsapp','manual')),
  created_at timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status);

comment on table public.inquiries is 'Customer inquiries from contact form; visible in Fusion Xpress dashboard.';

alter table public.inquiries enable row level security;

-- Only admins/managers can read and update inquiries. Inserts come from API (service role).
drop policy if exists "inquiries_admin_select" on public.inquiries;
create policy "inquiries_admin_select"
on public.inquiries
for select
to authenticated
using (public.is_admin());

drop policy if exists "inquiries_admin_update" on public.inquiries;
create policy "inquiries_admin_update"
on public.inquiries
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No direct insert/delete from client; API uses service role.
revoke insert, delete on public.inquiries from anon, authenticated;
grant select, update on public.inquiries to authenticated;
