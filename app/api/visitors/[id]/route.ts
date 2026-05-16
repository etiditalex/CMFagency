import { NextRequest, NextResponse } from "next/server";

import { mapVisitorRow, isMissingVisitorsTable, type VisitorRow } from "@/lib/visitors/db-mapper";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import type { VisitorStatus } from "@/lib/visitors/types";

const STATUSES: VisitorStatus[] = [
  "pending",
  "approved",
  "rejected",
  "checked_in",
  "checked_out",
];

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await ctx.params;
    const visitorId = String(id ?? "").trim();
    if (!visitorId) {
      return NextResponse.json({ error: "Missing visitor id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const statusRaw = String(body.status ?? "").trim() as VisitorStatus;
    if (!STATUSES.includes(statusRaw)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let existingQ = admin.from("visitors").select("id,owner_id,status").eq("id", visitorId);
    if (!isAdmin) existingQ = existingQ.eq("owner_id", userId);
    const { data: existing, error: fetchErr } = await existingQ.maybeSingle();
    if (fetchErr) {
      if (isMissingVisitorsTable(fetchErr)) {
        return NextResponse.json({ error: "Visitor tables not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = { status: statusRaw };
    if (statusRaw === "rejected") {
      patch.qr_code_token = null;
    }

    let updateQ = admin.from("visitors").update(patch).eq("id", visitorId);
    if (!isAdmin) updateQ = updateQ.eq("owner_id", userId);

    const { data, error } = await updateQ
      .select(
        "id,owner_id,site_id,full_name,phone_number,id_passport_number,vehicle_plate_number,host,purpose_of_visit,visit_date,visit_time,status,qr_code_token,industry_slug,source,form_extra,checked_in_at,checked_out_at,created_at,updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ visitor: mapVisitorRow(data as VisitorRow) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
