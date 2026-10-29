import { KENYA_COUNTY_DEFINITIONS } from "@/lib/kenya-counties";

export const KFCAA_REGIONS = [
  "Nairobi",
  "Coast",
  "Central",
  "Eastern",
  "North Eastern",
  "Nyanza",
  "Rift Valley",
  "Western",
] as const;

export type KfcaaRegion = (typeof KFCAA_REGIONS)[number];
export type VolunteerRole = "regional" | "county";
export type VolunteerStatus = "new" | "reviewed" | "shortlisted" | "rejected";

export const VOLUNTEER_STATUSES: readonly VolunteerStatus[] = ["new", "reviewed", "shortlisted", "rejected"];

export const CREATIVE_AREAS = [
  { id: "fashion", label: "Fashion" },
  { id: "modelling", label: "Modelling" },
  { id: "design", label: "Design" },
  { id: "photography", label: "Photography" },
  { id: "film", label: "Film" },
  { id: "music", label: "Music" },
  { id: "visual-arts", label: "Visual arts" },
  { id: "wider-creative", label: "Wider creative industry" },
] as const;

export type CreativeAreaId = (typeof CREATIVE_AREAS)[number]["id"];

const COUNTIES_BY_REGION: Record<KfcaaRegion, readonly string[]> = {
  Nairobi: ["Nairobi County"],
  Coast: [
    "Mombasa County",
    "Kwale County",
    "Kilifi County",
    "Tana River County",
    "Lamu County",
    "Taita-Taveta County",
  ],
  Central: ["Kiambu County", "Kirinyaga County", "Murang'a County", "Nyandarua County", "Nyeri County"],
  Eastern: [
    "Embu County",
    "Isiolo County",
    "Kitui County",
    "Machakos County",
    "Makueni County",
    "Marsabit County",
    "Meru County",
    "Tharaka-Nithi County",
  ],
  "North Eastern": ["Garissa County", "Wajir County", "Mandera County"],
  Nyanza: ["Homa Bay County", "Kisii County", "Kisumu County", "Migori County", "Nyamira County", "Siaya County"],
  "Rift Valley": [
    "Baringo County",
    "Bomet County",
    "Elgeyo-Marakwet County",
    "Kajiado County",
    "Kericho County",
    "Laikipia County",
    "Nakuru County",
    "Nandi County",
    "Narok County",
    "Samburu County",
    "Trans Nzoia County",
    "Turkana County",
    "Uasin Gishu County",
    "West Pokot County",
  ],
  Western: ["Bungoma County", "Busia County", "Kakamega County", "Vihiga County"],
};

const COUNTY_REGION = new Map<string, KfcaaRegion>(
  KFCAA_REGIONS.flatMap((region) => COUNTIES_BY_REGION[region].map((county) => [county, region] as const))
);

const CREATIVE_AREA_IDS = new Set<string>(CREATIVE_AREAS.map((item) => item.id));
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isKnownCounty(county: string): boolean {
  return KENYA_COUNTY_DEFINITIONS.some((item) => item.label === county);
}

export function isKfcaaRegion(value: string): value is KfcaaRegion {
  return (KFCAA_REGIONS as readonly string[]).includes(value);
}

export function regionForCounty(county: string): KfcaaRegion | null {
  return COUNTY_REGION.get(county) ?? null;
}

export function isCreativeAreaId(value: string): value is CreativeAreaId {
  return CREATIVE_AREA_IDS.has(value);
}

export function creativeAreaLabel(id: string): string {
  return CREATIVE_AREAS.find((item) => item.id === id)?.label ?? id;
}

export function roleLabel(role: VolunteerRole): string {
  return role === "regional" ? "Regional Representative" : "County Representative";
}

export function statusLabel(status: VolunteerStatus): string {
  if (status === "new") return "New";
  if (status === "reviewed") return "Reviewed";
  if (status === "shortlisted") return "Shortlisted";
  return "Rejected";
}

export function isVolunteerStatus(value: string): value is VolunteerStatus {
  return (VOLUNTEER_STATUSES as readonly string[]).includes(value);
}

export function makeVolunteerCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let body = "";
  for (const byte of bytes) body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `KFV-${body}`;
}

export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function formatSubmittedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
