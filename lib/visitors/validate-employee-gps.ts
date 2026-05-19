import type { SupabaseClient } from "@supabase/supabase-js";

import { getOrgLocation, isMissingOrgLocationTable } from "@/lib/visitors/org-location-db";
import { haversineDistanceMeters, isValidCoordinate } from "@/lib/visitors/geocode";

export type ScanGpsInput = {
  latitude?: unknown;
  longitude?: unknown;
  accuracyMeters?: unknown;
};

export type GpsValidationResult =
  | { ok: true; verified: boolean; distanceM: number | null }
  | { ok: false; error: string; status: number };

const MAX_ACCURACY_M = 150;
const ACCURACY_BUFFER_CAP_M = 40;

/**
 * Enforces workplace geofence for every employee scan when a workplace pin exists.
 * Trial and paid plans are treated the same — sign-in/out only at the registered site.
 */
export async function validateEmployeeScanGps(
  admin: SupabaseClient,
  ownerId: string,
  gps: ScanGpsInput
): Promise<GpsValidationResult> {
  let orgLocation;
  try {
    orgLocation = await getOrgLocation(admin, ownerId);
  } catch (e) {
    if (isMissingOrgLocationTable(e)) {
      return {
        ok: false,
        error:
          "GPS tracking is not set up yet. Run database/visitor_management_patch_06_gps_tracking.sql in Supabase.",
        status: 503,
      };
    }
    throw e;
  }

  if (!orgLocation) {
    return {
      ok: false,
      error:
        "Your organisation workplace location is not configured yet. Ask your manager to set it up under Visitor Management → Employees → GPS tracking in the dashboard.",
      status: 403,
    };
  }

  const scanLat = Number(gps.latitude);
  const scanLon = Number(gps.longitude);
  if (!isValidCoordinate(scanLat, scanLon)) {
    return {
      ok: false,
      error:
        "Location is required to sign in or out. Turn on location services for this browser and try again.",
      status: 400,
    };
  }

  const accuracy = Number(gps.accuracyMeters);
  if (Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_M) {
    return {
      ok: false,
      error: `GPS signal is too weak (±${Math.round(accuracy)} m). Move closer to a window or try again.`,
      status: 400,
    };
  }

  const distanceM = haversineDistanceMeters(
    scanLat,
    scanLon,
    orgLocation.latitude,
    orgLocation.longitude
  );

  const accuracyBuffer = Number.isFinite(accuracy)
    ? Math.min(accuracy, ACCURACY_BUFFER_CAP_M)
    : 0;
  const allowedRadiusM = orgLocation.geofenceRadiusM + accuracyBuffer;

  if (distanceM > allowedRadiusM) {
    return {
      ok: false,
      error: `You must be at your registered workplace to sign in or out (${distanceM} m away; allowed within ${orgLocation.geofenceRadiusM} m).`,
      status: 403,
    };
  }

  return { ok: true, verified: true, distanceM };
}
