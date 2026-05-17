import { NextRequest, NextResponse } from "next/server";

import { mapVisitorRow, isMissingVisitorsTable, type VisitorRow } from "@/lib/visitors/db-mapper";
import { formatCheckInClock, formatCheckInDateLabel } from "@/lib/visitors/format-check-in-display";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

type RouteCtx = { params: Promise<{ id: string }> };

/** Public check-out from visitor confirmation screen (uses visitor id from check-in response). */
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { id } = await ctx.params;
    const visitorId = String(id ?? "").trim();
    if (!visitorId) {
      return NextResponse.json({ error: "Missing visitor id" }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await admin
      .from("visitors")
      .select("id,status,checked_in_at,checked_out_at")
      .eq("id", visitorId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingVisitorsTable(fetchErr)) {
        return NextResponse.json({ error: "Visitor tables not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    if ((existing as { status: string }).status === "checked_out") {
      return NextResponse.json({ error: "Already checked out" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("visitors")
      .update({ status: "checked_out" })
      .eq("id", visitorId)
      .select(
        "id,owner_id,site_id,full_name,phone_number,id_passport_number,vehicle_plate_number,host,purpose_of_visit,visit_date,visit_time,status,qr_code_token,industry_slug,source,form_extra,checked_in_at,checked_out_at,created_at,updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const visitor = mapVisitorRow(data as VisitorRow);
    const checkedOutAt = (data as VisitorRow).checked_out_at ?? new Date().toISOString();

    return NextResponse.json({
      ok: true,
      visitor,
      checkOut: {
        checkedOutAt,
        timeLabel: formatCheckInClock(checkedOutAt),
        dateLabel: formatCheckInDateLabel(checkedOutAt),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
