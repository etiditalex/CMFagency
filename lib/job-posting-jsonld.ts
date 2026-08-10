import { SITE_URL } from "@/lib/site-url";
import { formatEmploymentType } from "@/lib/job-board-access";

export type JobPostingInput = {
  title: string;
  description: string;
  datePosted: string | null;
  companyName: string;
  location: string | null;
  employmentType: string;
  salaryText?: string | null;
  /** Canonical page URL on cmfagency.co.ke */
  url: string;
  /** Direct apply URL when different from page URL (aggregated jobs) */
  directApplyUrl?: string | null;
  remote?: boolean;
  identifier?: string;
};

const SCHEMA_EMPLOYMENT: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  attachment: "INTERN",
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseLocation(location: string | null): {
  jobLocation?: Record<string, unknown>;
  jobLocationType?: string;
  applicantLocationRequirements?: Record<string, unknown>;
} {
  const loc = (location ?? "").trim();
  const lower = loc.toLowerCase();
  const looksRemote =
    !loc ||
    lower.includes("remote") ||
    lower.includes("work from home") ||
    lower.includes("anywhere") ||
    lower === "worldwide";

  if (looksRemote) {
    return {
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: {
        "@type": "Country",
        name: lower.includes("kenya") ? "KE" : "Worldwide",
      },
    };
  }

  // Best-effort Place; Google accepts locality-level addresses for job boards.
  const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
  const addressLocality = parts[0] || loc;
  const addressRegion = parts[1];
  const addressCountry =
    lower.includes("kenya") || lower.includes("nairobi") || lower.includes("mombasa")
      ? "KE"
      : parts.length > 1
        ? parts[parts.length - 1]
        : "KE";

  return {
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality,
        ...(addressRegion ? { addressRegion } : {}),
        addressCountry: addressCountry.length <= 3 ? addressCountry : "KE",
      },
    },
  };
}

/**
 * Build schema.org JobPosting for Google Jobs / rich results.
 * Description must match visible page content.
 */
export function buildJobPostingJsonLd(input: JobPostingInput): Record<string, unknown> {
  const description = stripHtml(input.description).slice(0, 5000);
  const employment =
    SCHEMA_EMPLOYMENT[String(input.employmentType || "").toLowerCase()] ||
    formatEmploymentType(input.employmentType).toUpperCase().replace(/\s+/g, "_");

  const locationBits = parseLocation(input.location);
  const datePosted = input.datePosted
    ? new Date(input.datePosted).toISOString()
    : new Date().toISOString();

  // validThrough: 60 days from posted (or now) when source does not provide expiry
  const validThrough = new Date(datePosted);
  validThrough.setDate(validThrough.getDate() + 60);

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: description || `${input.title} at ${input.companyName}`,
    datePosted,
    validThrough: validThrough.toISOString(),
    employmentType: employment,
    hiringOrganization: {
      "@type": "Organization",
      name: input.companyName || "Changer Fusions",
      sameAs: SITE_URL,
    },
    identifier: {
      "@type": "PropertyValue",
      name: "Changer Fusions",
      value: input.identifier || input.url,
    },
    url: input.url,
    directApply: Boolean(input.directApplyUrl),
  };

  if (input.directApplyUrl) {
    json.applicationContact = {
      "@type": "ContactPoint",
      url: input.directApplyUrl,
    };
  }

  Object.assign(json, locationBits);

  // Only emit baseSalary when we can parse a numeric amount (Google rejects free-text values).
  const salaryRaw = input.salaryText?.trim() ?? "";
  const salaryMatch = salaryRaw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (salaryMatch) {
    const amount = Number(salaryMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      json.baseSalary = {
        "@type": "MonetaryAmount",
        currency: /usd|\$/i.test(salaryRaw) ? "USD" : "KES",
        value: {
          "@type": "QuantitativeValue",
          unitText: /month|\/mo/i.test(salaryRaw) ? "MONTH" : "YEAR",
          value: amount,
        },
      };
    }
  }

  return json;
}
