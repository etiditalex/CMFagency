export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

function buildAddressQuery(parts: {
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}): string {
  return [
    parts.addressLine1,
    parts.addressLine2,
    parts.suburb,
    parts.state,
    parts.postcode,
    parts.country,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Geocode a postal address via OpenStreetMap Nominatim (no API key). */
export async function geocodeAddress(parts: {
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}): Promise<GeocodeResult | null> {
  const q = buildAddressQuery(parts);
  if (!q || q.length < 8) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cmfagency.co.ke";
  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": `CMFAgency-FusionXpress/1.0 (${siteUrl})`,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;

  const rows = (await res.json().catch(() => [])) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const hit = rows[0];
  if (!hit?.lat || !hit?.lon) return null;

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    displayName: String(hit.display_name ?? q),
  };
}
