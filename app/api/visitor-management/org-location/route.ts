import { NextRequest, NextResponse } from "next/server";

import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import {
  geocodeAndSaveOrgLocationFromAddress,
  getOrgLocation,
  isMissingOrgLocationTable,
  upsertOrgLocation,
} from "@/lib/visitors/org-location-db";
import { geocodeAddress, isValidCoordinate } from "@/lib/visitors/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const location = await getOrgLocation(admin, userId);
    return NextResponse.json({ location });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingOrgLocationTable(e)) {
      return NextResponse.json(
        {
          setupRequired: true,
          message: "Run database/visitor_management_patch_06_gps_tracking.sql in Supabase.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    if (isAdmin) {
      return NextResponse.json({ error: "Use a visitor organisation account." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const geofenceRadiusM = Math.min(
      2000,
      Math.max(25, Math.round(Number(body.geofenceRadiusM ?? body.geofence_radius_m ?? 150)))
    );

    const address = {
      addressLine1: String(body.addressLine1 ?? body.address_line_1 ?? "").trim(),
      addressLine2: String(body.addressLine2 ?? body.address_line_2 ?? "").trim(),
      suburb: String(body.suburb ?? "").trim(),
      state: String(body.state ?? "").trim(),
      postcode: String(body.postcode ?? "").trim(),
      country: String(body.country ?? "").trim(),
    };

    const lat = body.latitude ?? body.lat;
    const lon = body.longitude ?? body.lng ?? body.lon;

    if (isValidCoordinate(lat, lon)) {
      const saved = await upsertOrgLocation(
        admin,
        userId,
        {
          latitude: Number(lat),
          longitude: Number(lon),
          displayName: "Manual pin",
        },
        address,
        geofenceRadiusM
      );
      if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
      return NextResponse.json({ location: saved.location });
    }

    if (body.regeocode === true || body.action === "geocode") {
      if (!address.addressLine1 && !address.suburb) {
        return NextResponse.json(
          {
            error:
              "Provide a street address or suburb/city on your profile, or use “Set pin to this device” on the Employees page.",
          },
          { status: 400 }
        );
      }
      if (!address.country) {
        address.country = "Kenya";
      }
      const saved = await geocodeAndSaveOrgLocationFromAddress(admin, userId, address, geofenceRadiusM);
      if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
      return NextResponse.json({ location: saved.location });
    }

    return NextResponse.json(
      { error: "Provide latitude/longitude or set regeocode: true with your business address." },
      { status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
