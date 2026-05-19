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

/** ISO 3166-1 alpha-2 for Nominatim countrycodes filter. */
export function countryToIso2(country: string): string | undefined {
  const c = String(country ?? "").trim().toLowerCase();
  if (!c) return undefined;
  if (c === "ke" || c.includes("kenya")) return "ke";
  if (c === "ug" || c.includes("uganda")) return "ug";
  if (c === "tz" || c.includes("tanzania")) return "tz";
  if (c.length === 2 && /^[a-z]{2}$/.test(c)) return c;
  return undefined;
}

const NOMINATIM_UA =
  "CMFAgency-FusionXpress/1.0 (https://cmfagency.co.ke; contact@cmfagency.co.ke)";

async function nominatimSearch(
  query: string,
  countryCode?: string
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q || q.length < 4) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  if (countryCode) url.searchParams.set("countrycodes", countryCode);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
      },
      cache: "no-store",
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
  } catch {
    return null;
  }
}

function geocodeQueryVariants(parts: {
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}): string[] {
  const line1 = String(parts.addressLine1 ?? "").trim();
  const line2 = String(parts.addressLine2 ?? "").trim();
  const suburb = String(parts.suburb ?? "").trim();
  const state = String(parts.state ?? "").trim();
  const postcode = String(parts.postcode ?? "").trim();
  const country = String(parts.country ?? "").trim();

  const variants: string[] = [];

  const full = buildAddressQuery(parts);
  if (full) variants.push(full);

  if (line1 && suburb && state && country) {
    variants.push([line1, suburb, state, country].join(", "));
  }
  if (line1 && line2 && suburb && country) {
    variants.push([line1, line2, suburb, country].join(", "));
  }
  if (line1 && country) variants.push([line1, country].join(", "));
  if (suburb && state && country) variants.push([suburb, state, country].join(", "));
  if (suburb && country) variants.push([suburb, country].join(", "));
  if (state && country) variants.push([state, country].join(", "));
  if (postcode && country) variants.push([postcode, country].join(", "));

  // Mombasa-area fallback when only street + Kenya
  if (line1 && country.toLowerCase().includes("kenya") && !suburb) {
    variants.push([line1, "Mombasa", country].join(", "));
  }

  return [...new Set(variants.filter((v) => v.length >= 4))];
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
  const countryCode = countryToIso2(parts.country);
  const queries = geocodeQueryVariants(parts);

  if (queries.length === 0) return null;

  for (let i = 0; i < queries.length; i++) {
    const hit = await nominatimSearch(queries[i], countryCode);
    if (hit) return hit;
    // Nominatim usage policy: max 1 request per second
    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return null;
}
