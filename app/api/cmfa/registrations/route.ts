import { NextRequest, NextResponse } from "next/server";

import { cmfaDesignationLabel } from "@/lib/cmfa-registration";
import { requireGateAccess } from "@/lib/require-gate-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || "pending";
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));

  const SELECT_WITH_TIER =
    "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at, ticket_tier";
  const SELECT_LEGACY =
    "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at";

  const run = (columns: string) => {
    let query = admin
      .from("cmfa_registrations")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status !== "all") query = query.eq("status", status);
    return query;
  };

  let { data, error } = await run(SELECT_WITH_TIER);
  if (error && /ticket_tier/i.test(error.message)) {
    const retry = await run(SELECT_LEGACY);
    data = retry.data;
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((row) => ({
    ...row,
    designation_label: cmfaDesignationLabel(String((row as { designation?: string }).designation ?? "")),
  }));

  return NextResponse.json({ registrations: rows });
}
