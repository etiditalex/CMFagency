/** Maps SEO pricing package ids (page anchors) to Paystack/Daraja campaign slugs and amounts. */

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

const BY_PACKAGE_ID = new Map(SEO_SERVICE_PACKAGES.map((p) => [p.packageId, p]));
const BY_CAMPAIGN_SLUG = new Map(SEO_SERVICE_PACKAGES.map((p) => [p.campaignSlug, p]));

export function getSeoPackageById(packageId: string): ServicePackageDef | null {
  return BY_PACKAGE_ID.get(packageId) ?? null;
}

export function getSeoPackageByCampaignSlug(slug: string): ServicePackageDef | null {
  return BY_CAMPAIGN_SLUG.get(slug.trim().toLowerCase()) ?? null;
}
