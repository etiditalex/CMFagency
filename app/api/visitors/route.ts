import { NextRequest, NextResponse } from "next/server";

import { mapVisitorRow, isMissingVisitorsTable, type VisitorRow } from "@/lib/visitors/db-mapper";
import { getIndustryDemo } from "@/lib/visitors/industry-demos";
import { mapIndustryFormToVisitor } from "@/lib/visitors/industry-form-mapper";
import { isVisitorIndustrySlug } from "@/lib/visitors/industry-options";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

function safeDate(v: unknown) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function safeTime(v: unknown) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    let q = admin
      .from("visitors")
      .select(
        "id,owner_id,site_id,full_name,phone_number,id_passport_number,vehicle_plate_number,host,purpose_of_visit,visit_date,visit_time,status,qr_code_token,industry_slug,source,form_extra,checked_in_at,checked_out_at,created_at,updated_at"
      )
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (!isAdmin) {
      q = q.eq("owner_id", userId);
    }

    const industrySlug = req.nextUrl.searchParams.get("industrySlug")?.trim() ?? "";
    if (industrySlug && isVisitorIndustrySlug(industrySlug)) {
      q = q.eq("industry_slug", industrySlug);
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingVisitorsTable(error)) {
        return NextResponse.json({
          visitors: [],
          setupRequired: true,
          message: "Run database/visitor_management_patch_01.sql in Supabase SQL Editor.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const visitors = ((data ?? []) as VisitorRow[]).map(mapVisitorRow);
    return NextResponse.json({ visitors });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const industrySlug = safeText(body.industrySlug ?? body.industry_slug, 80);
    if (industrySlug && getIndustryDemo(industrySlug)) {
      const values =
        body.values && typeof body.values === "object" && !Array.isArray(body.values)
          ? (body.values as Record<string, unknown>)
          : body;

      const mapped = mapIndustryFormToVisitor(industrySlug, values);
      if ("error" in mapped) {
        return NextResponse.json({ error: mapped.error }, { status: 400 });
      }

      const row = {
        owner_id: userId,
        ...mapped.row,
        status: "pending",
        source: "dashboard",
      };

      const { data, error } = await admin.from("visitors").insert(row).select().single();
      if (error) {
        if (isMissingVisitorsTable(error)) {
          return NextResponse.json(
            {
              error: "Visitor tables not set up. Run database/visitor_management_patch_01.sql in Supabase.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ visitor: mapVisitorRow(data as VisitorRow) }, { status: 201 });
    }

    const full_name = safeText(body.fullName ?? body.full_name, 200);
    const phone_number = safeText(body.phoneNumber ?? body.phone_number, 40);
    const host = safeText(body.host, 200);
    const purpose_of_visit = safeText(body.purposeOfVisit ?? body.purpose_of_visit, 500);
    const visit_date = safeDate(body.visitDate ?? body.visit_date);
    const visit_time = safeTime(body.visitTime ?? body.visit_time);

    if (!full_name || !phone_number || !host || !purpose_of_visit || !visit_date || !visit_time) {
      return NextResponse.json({ error: "Missing required visitor fields." }, { status: 400 });
    }

    const industry_slug = safeText(body.industrySlug ?? body.industry_slug, 80);

    const row = {
      owner_id: userId,
      full_name,
      phone_number,
      id_passport_number: safeText(body.idPassportNumber ?? body.id_passport_number, 80),
      vehicle_plate_number: safeText(body.vehiclePlateNumber ?? body.vehicle_plate_number, 32),
      host,
      purpose_of_visit,
      visit_date,
      visit_time,
      status: "pending",
      source: "dashboard",
      form_extra: {},
      ...(industry_slug && isVisitorIndustrySlug(industry_slug) ? { industry_slug } : {}),
    };

    const { data, error } = await admin.from("visitors").insert(row).select().single();
    if (error) {
      if (isMissingVisitorsTable(error)) {
        return NextResponse.json(
          {
            error: "Visitor tables not set up. Run database/visitor_management_patch_01.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ visitor: mapVisitorRow(data as VisitorRow) }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
