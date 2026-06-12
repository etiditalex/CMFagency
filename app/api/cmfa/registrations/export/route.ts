import { NextRequest, NextResponse } from "next/server";

import {
  CMFA_EVENT_SLUG,
  cmfaDesignationLabel,
  cmfaTicketId,
} from "@/lib/cmfa-registration";
import { requireGateAccess } from "@/lib/require-gate-access";

export const runtime = "nodejs";

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" });
}

export async function GET(req: NextRequest) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || "approved";
  const eventSlug = url.searchParams.get("event_slug")?.trim() || CMFA_EVENT_SLUG;

  let query = admin
    .from("cmfa_registrations")
    .select(
      "reference, name, email, phone, designation, status, is_guest, approved_at, checked_in_at, created_at"
    )
    .eq("event_slug", eventSlug)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(10000);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    reference: string;
    name: string;
    email: string;
    phone: string | null;
    designation: string;
    status: string;
    is_guest: boolean;
    approved_at: string | null;
    checked_in_at: string | null;
    created_at: string;
  };

  const rows = (data ?? []) as Row[];

  const headers = [
    "Registered",
    "Approved",
    "Gate check-in",
    "Ticket ID",
    "Name",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Guest",
    "Reference",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escapeCsv(fmt(r.created_at)),
        escapeCsv(fmt(r.approved_at)),
        escapeCsv(fmt(r.checked_in_at)),
        escapeCsv(cmfaTicketId(r.reference)),
        escapeCsv(r.name),
        escapeCsv(r.email),
        escapeCsv(r.phone ?? ""),
        escapeCsv(cmfaDesignationLabel(r.designation)),
        escapeCsv(r.status),
        escapeCsv(r.is_guest ? "Yes" : "No"),
        escapeCsv(r.reference),
      ].join(",")
    ),
  ];

  const csv = lines.join("\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  const statusSlug = status === "all" ? "all" : status;
  const filename = `cmfa-registrations-${statusSlug}-${dateStr}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
