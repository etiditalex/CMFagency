/** Maps service pricing package ids (page anchors) to Paystack/Daraja campaign slugs and amounts. */

export type ServicePackageDef = {
  /** Stable id used in UI / URLs */
  packageId: string;
  /** Unique campaigns.slug for transactions */
  campaignSlug: string;
  title: string;
  descriptionLine: string;
  /** Whole KES per month (matches campaigns.unit_amount) */
  amountKes: number;
};

export const SEO_SERVICE_PACKAGES: ServicePackageDef[] = [
  {
    packageId: "basic-seo-plan",
    campaignSlug: "seo-basic-monthly",
    title: "Basic SEO Plan",
    descriptionLine: "Monthly SEO subscription — Basic tier (local/regional focus).",
    amountKes: 20_000,
  },
  {
    packageId: "standard-seo-plan",
    campaignSlug: "seo-standard-monthly",
    title: "Standard SEO Plan",
    descriptionLine: "Monthly SEO subscription — Standard tier (nationwide / competitive).",
    amountKes: 40_000,
  },
  {
    packageId: "enterprise-seo",
    campaignSlug: "seo-enterprise-monthly",
    title: "Enterprise SEO",
    descriptionLine: "Monthly SEO subscription — Enterprise tier.",
    amountKes: 60_000,
  },
];

export const SOCIAL_MEDIA_SERVICE_PACKAGES: ServicePackageDef[] = [
  {
    packageId: "smm-basic",
    campaignSlug: "smm-basic-monthly",
    title: "Basic — Social Media Marketing",
    descriptionLine: "Monthly social media management — Basic tier.",
    amountKes: 20_000,
  },
  {
    packageId: "smm-standard",
    campaignSlug: "smm-standard-monthly",
    title: "Standard — Social Media Marketing",
    descriptionLine: "Monthly social media management — Standard tier.",
    amountKes: 35_000,
  },
  {
    packageId: "smm-enterprise",
    campaignSlug: "smm-enterprise-monthly",
    title: "Enterprise — Social Media Marketing",
    descriptionLine: "Monthly social media management — Enterprise tier.",
    amountKes: 55_000,
  },
];

/** All billable service packages (SEO, social, etc.) — used for invoices and payment campaigns. */
export const ALL_SERVICE_PACKAGES: ServicePackageDef[] = [
  ...SEO_SERVICE_PACKAGES,
  ...SOCIAL_MEDIA_SERVICE_PACKAGES,
];

const BY_PACKAGE_ID = new Map(ALL_SERVICE_PACKAGES.map((p) => [p.packageId, p]));
const BY_CAMPAIGN_SLUG = new Map(ALL_SERVICE_PACKAGES.map((p) => [p.campaignSlug, p]));

/** Resolve any registered service package by stable id (SEO, social media, …). */
export function getServicePackageById(packageId: string): ServicePackageDef | null {
  return BY_PACKAGE_ID.get(packageId) ?? null;
}

export function getSeoPackageById(packageId: string): ServicePackageDef | null {
  return getServicePackageById(packageId);
}

export function getSeoPackageByCampaignSlug(slug: string): ServicePackageDef | null {
  return BY_CAMPAIGN_SLUG.get(slug.trim().toLowerCase()) ?? null;
}
