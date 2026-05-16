import type { VisitorRecord, VisitorStatus } from "@/lib/visitors/types";

export type VisitorRow = {
  id: string;
  owner_id: string;
  site_id: string | null;
  full_name: string;
  phone_number: string;
  id_passport_number: string | null;
  vehicle_plate_number: string | null;
  host: string;
  purpose_of_visit: string;
  visit_date: string;
  visit_time: string;
  status: VisitorStatus;
  qr_code_token: string | null;
  industry_slug: string | null;
  source: string;
  form_extra: Record<string, unknown> | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
};

/** DB time may be `14:30:00` — normalize to HH:mm for UI. */
export function normalizeVisitTime(t: string): string {
  const s = String(t ?? "").trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : s;
}

export function mapVisitorRow(row: VisitorRow): VisitorRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    idPassportNumber: row.id_passport_number ?? "",
    vehiclePlateNumber: row.vehicle_plate_number ?? "",
    host: row.host,
    purposeOfVisit: row.purpose_of_visit,
    visitDate: row.visit_date,
    visitTime: normalizeVisitTime(row.visit_time),
    status: row.status,
    qrCodeToken: row.qr_code_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isMissingVisitorsTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return (
    code === "42P01" ||
    (msg.includes("visitors") && msg.includes("does not exist")) ||
    msg.includes("visitor_management_patch")
  );
}
