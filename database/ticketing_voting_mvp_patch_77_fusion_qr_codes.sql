-- Fusion Xpress QR code generation records
create table if not exists public.fusion_qr_codes (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'website', 'linkedin', 'tiktok', 'custom')),
  label text null,
  destination_url text null,
  whatsapp_phone text null,
  whatsapp_message text null,
  qr_payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists fusion_qr_codes_created_at_idx
  on public.fusion_qr_codes (created_at desc);

alter table public.fusion_qr_codes enable row level security;

drop policy if exists "fusion_qr_codes_service_role_insert" on public.fusion_qr_codes;
create policy "fusion_qr_codes_service_role_insert"
  on public.fusion_qr_codes
  for insert
  to service_role
  with check (true);

drop policy if exists "fusion_qr_codes_service_role_select" on public.fusion_qr_codes;
create policy "fusion_qr_codes_service_role_select"
  on public.fusion_qr_codes
  for select
  to service_role
  using (true);
