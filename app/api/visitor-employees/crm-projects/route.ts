import { NextRequest, NextResponse } from "next/server";

import {
  CRM_SITE_SETUP_MESSAGE,
  isMissingCrmSiteTables,
  mapCrmProjectRow,
  type CrmProjectRow,
} from "@/lib/employees/crm-site-db";
import { assertRealEstateOrganization } from "@/lib/employees/require-real-estate-org";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { geocodeAddress } from "@/lib/visitors/geocode";

export const dynamic = "force-dynamic";

function safeText(v: unknown, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const industryCheck = await assertRealEstateOrganization(admin, userId);
    if (!industryCheck.ok) {
      return NextResponse.json({ error: industryCheck.error }, { status: 403 });
    }

    let q = admin
      .from("visitor_crm_projects")
      .select("*")
      .order("name", { ascending: true });
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q;
    if (error) {
      if (isMissingCrmSiteTables(error)) {
        return NextResponse.json({ projects: [], setupRequired: true, message: CRM_SITE_SETUP_MESSAGE });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const projects = ((data ?? []) as CrmProjectRow[]).map(mapCrmProjectRow);
    return NextResponse.json({ projects });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const industryCheck = await assertRealEstateOrganization(admin, userId);
    if (!industryCheck.ok) {
      return NextResponse.json({ error: industryCheck.error }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = safeText(body.name, 200);
    if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

    const addressLine1 = safeText(body.addressLine1 ?? body.address_line_1, 200);
    const suburb = safeText(body.suburb, 120);
    const state = safeText(body.state, 80);
    const country = safeText(body.country, 80) || "Kenya";

    let latitude: number | null = body.latitude != null ? Number(body.latitude) : null;
    let longitude: number | null = body.longitude != null ? Number(body.longitude) : null;

    if ((latitude == null || longitude == null) && addressLine1) {
      const geo = await geocodeAddress({
        addressLine1,
        addressLine2: safeText(body.addressLine2, 200),
        suburb,
        state,
        postcode: safeText(body.postcode, 20),
        country,
      });
      if (geo) {
        latitude = geo.latitude;
        longitude = geo.longitude;
      }
    }

    const { data, error } = await admin
      .from("visitor_crm_projects")
      .insert({
        owner_id: userId,
        name,
        address_line1: addressLine1 || null,
        address_line2: safeText(body.addressLine2, 200) || null,
        suburb: suburb || null,
        state: state || null,
        postcode: safeText(body.postcode, 20) || null,
        country,
        latitude,
        longitude,
        geofence_radius_m: Math.min(500, Math.max(50, Number(body.geofenceRadiusM) || 200)),
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingCrmSiteTables(error)) {
        return NextResponse.json({ error: CRM_SITE_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: mapCrmProjectRow(data as CrmProjectRow) }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
