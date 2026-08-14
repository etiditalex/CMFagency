import { NextRequest, NextResponse } from "next/server";

import { cmfaDesignationLabel } from "@/lib/cmfa-registration";
import { requireGateAccess } from "@/lib/require-gate-access";

export const runtime = "nodejs";

type RegistrationListRow = {
  id: string;
  reference: string;
  event_slug?: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  status: string;
  is_guest: boolean;
  parent_registration_id: string | null;
  checked_in_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  ticket_tier?: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || "pending";
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));

  let query = admin
    .from("cmfa_registrations")
    .select(
      "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at, ticket_tier"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);

  let { data, error } = await query;
  if (error && /ticket_tier/i.test(error.message)) {
    let retryQuery = admin
      .from("cmfa_registrations")
      .select(
        "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status !== "all") retryQuery = retryQuery.eq("status", status);
    const retry = await retryQuery;
    data = retry.data as typeof data;
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as unknown as RegistrationListRow[]).map((row) => ({
    ...row,
    designation_label: cmfaDesignationLabel(String(row.designation ?? "")),
  }));

  return NextResponse.json({ registrations: rows });
}
