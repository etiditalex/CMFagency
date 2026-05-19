import type { SupabaseClient } from "@supabase/supabase-js";

import { geocodeAddress, type GeocodeResult } from "@/lib/visitors/geocode";

export type OrgLocationRow = {
  owner_id: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  address_line_1: string;
  address_line_2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  geocoded_at: string;
};

export type OrgLocation = {
  ownerId: string;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  geocodedAt: string;
};

export function mapOrgLocationRow(row: OrgLocationRow | null): OrgLocation | null {
  if (!row) return null;
  return {
    ownerId: row.owner_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    geofenceRadiusM: Number(row.geofence_radius_m) || 150,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2 ?? "",
    suburb: row.suburb,
    state: row.state,
    postcode: row.postcode,
    country: row.country,
    geocodedAt: row.geocoded_at,
  };
}

const SELECT_COLS =
  "owner_id,latitude,longitude,geofence_radius_m,address_line_1,address_line_2,suburb,state,postcode,country,geocoded_at";

export async function getOrgLocation(
  admin: SupabaseClient,
  ownerId: string
): Promise<OrgLocation | null> {
  const { data, error } = await admin
    .from("visitor_management_org_locations")
    .select(SELECT_COLS)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrgLocationRow(data as OrgLocationRow);
}

export async function upsertOrgLocation(
  admin: SupabaseClient,
  ownerId: string,
  coords: GeocodeResult,
  address: {
    addressLine1: string;
    addressLine2?: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  },
  geofenceRadiusM = 150
): Promise<{ ok: true; location: OrgLocation } | { ok: false; error: string }> {
  const row = {
    owner_id: ownerId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    geofence_radius_m: geofenceRadiusM,
    address_line_1: address.addressLine1,
    address_line_2: address.addressLine2 ?? "",
    suburb: address.suburb,
    state: address.state,
    postcode: address.postcode,
    country: address.country,
    geocoded_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("visitor_management_org_locations")
    .upsert(row, { onConflict: "owner_id" })
    .select(SELECT_COLS)
    .single();

  if (error) return { ok: false, error: error.message };
  const location = mapOrgLocationRow(data as OrgLocationRow);
  if (!location) return { ok: false, error: "Could not save workplace location." };
  return { ok: true, location };
}

export async function geocodeAndSaveOrgLocationFromAddress(
  admin: SupabaseClient,
  ownerId: string,
  address: {
    addressLine1: string;
    addressLine2?: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  },
  geofenceRadiusM = 150
): Promise<{ ok: true; location: OrgLocation } | { ok: false; error: string }> {
  const hasUsableAddress =
    Boolean(String(address.addressLine1 ?? "").trim()) ||
    Boolean(String(address.suburb ?? "").trim());

  if (!hasUsableAddress) {
    return {
      ok: false,
      error:
        "Add your business address on your account profile, or use “Set pin to this device” while standing at reception.",
    };
  }

  const coords = await geocodeAddress(address);
  if (!coords) {
    return {
      ok: false,
      error:
        "We could not find that address on the map (the geocoder may be busy or the address is incomplete). Use “Set pin to this device” while at your workplace — that is the most reliable option.",
    };
  }
  return upsertOrgLocation(admin, ownerId, coords, address, geofenceRadiusM);
}

export function isMissingOrgLocationTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return msg.includes("visitor_management_org_locations") || msg.includes("does not exist");
}
