import { createClient } from "@supabase/supabase-js";
import { listingRequiresPaidMembership } from "@/lib/job-board-access";
import type { AggregatorSource, CollectedJob } from "@/lib/job-aggregators/types";
import { getLiveCollectedJobsCached } from "@/lib/job-board-feed-live";
import { parseExternalJobParam } from "@/lib/job-board-paths";

export { externalJobDetailPath, parseExternalJobParam } from "@/lib/job-board-paths";

export type EmployerJobListing = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  poster_url: string | null;
  industry: string | null;
  seniority: string | null;
  description: string;
  requirements: string[];
  benefits: string[];
  contact_email: string | null;
  published_at: string | null;
  locked: boolean;
  requires_paid_membership: boolean;
  lock_message: string | null;
};

export type ExternalJobListing = {
  id: string;
  source: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  description: string;
  apply_url: string;
  poster_url: string | null;
  industry: string | null;
  seniority: string | null;
  posted_at: string | null;
};

const LOCK_MESSAGE =
  "This vacancy is for members with an active job-board subscription (KES 500/year). Internship and industrial attachment roles are free to view.";

function supabaseAnon() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function collectedToExternal(j: CollectedJob): ExternalJobListing {
  return {
    id: `${j.source}--${j.external_id}`,
    source: j.source,
    title: j.title,
    company_name: j.company_name,
    location: j.location,
    employment_type: j.employment_type,
    salary_text: j.salary_text,
    summary: j.summary,
    description: j.description,
    apply_url: j.apply_url,
    poster_url: j.company_logo_url,
    industry: j.industry,
    seniority: j.seniority,
    posted_at: j.posted_at,
  };
}

function rowToExternal(r: Record<string, unknown>): ExternalJobListing {
  return {
    id: String(r.id),
    source: String(r.source ?? ""),
    title: String(r.title ?? ""),
    company_name: String(r.company_name ?? ""),
    location: r.location != null ? String(r.location) : null,
    employment_type: String(r.employment_type ?? "full_time"),
    salary_text: r.salary_text != null ? String(r.salary_text) : null,
    summary: r.summary != null ? String(r.summary) : null,
    description: String(r.description ?? ""),
    apply_url: String(r.apply_url ?? ""),
    poster_url:
      typeof r.company_logo_url === "string" && r.company_logo_url.trim()
        ? String(r.company_logo_url).trim()
        : null,
    industry: r.industry != null ? String(r.industry) : null,
    seniority: r.seniority != null ? String(r.seniority) : null,
    posted_at: r.posted_at != null ? String(r.posted_at) : null,
  };
}

/**
 * Public employer listing for SSR. Locked roles omit full description (use summary for SEO).
 */
export async function getEmployerJobForSeo(id: string): Promise<EmployerJobListing | null> {
  const supabase = supabaseAnon();
  if (!supabase || !id) return null;

  const { data: row, error } = await supabase
    .from("job_listings")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !row) return null;

  const r = row as Record<string, unknown>;
  const employmentType = String(r.employment_type ?? "");
  const needsMembership = listingRequiresPaidMembership(employmentType);
  const unlocked = !needsMembership;

  const poster =
    typeof r.poster_url === "string" && r.poster_url.trim() ? String(r.poster_url).trim() : null;
  const summary = r.summary != null ? String(r.summary) : null;
  const fullDescription = String(r.description ?? "");
  const requirements = Array.isArray(r.requirements) ? r.requirements.map(String) : [];
  const benefits = Array.isArray(r.benefits) ? r.benefits.map(String) : [];

  const publicTeaser =
    summary ||
    [
      `${String(r.title ?? "")} at ${String(r.company_name ?? "")}.`,
      r.location != null ? `Location: ${String(r.location)}.` : null,
      "Full description available to job-board members on Changer Fusions.",
    ]
      .filter(Boolean)
      .join(" ");

  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    company_name: String(r.company_name ?? ""),
    location: r.location != null ? String(r.location) : null,
    employment_type: employmentType,
    salary_text: r.salary_text != null ? String(r.salary_text) : null,
    summary: summary || (unlocked ? null : publicTeaser),
    poster_url: poster,
    industry: typeof r.industry === "string" ? r.industry : null,
    seniority: typeof r.seniority === "string" ? r.seniority : null,
    description: unlocked ? fullDescription : publicTeaser,
    requirements: unlocked ? requirements : [],
    benefits: unlocked ? benefits : [],
    contact_email: unlocked && r.contact_email != null ? String(r.contact_email) : null,
    published_at: r.published_at != null ? String(r.published_at) : null,
    locked: !unlocked,
    requires_paid_membership: needsMembership,
    lock_message: !unlocked ? LOCK_MESSAGE : null,
  };
}

/**
 * Aggregated job: DB by UUID or source--external_id, then live collector cache fallback.
 */
export async function getExternalJobForSeo(rawId: string): Promise<ExternalJobListing | null> {
  const parsed = parseExternalJobParam(rawId);
  if (!parsed) return null;

  const supabase = supabaseAnon();
  if (supabase) {
    let query = supabase
      .from("aggregated_jobs")
      .select(
        "id,source,title,company_name,location,employment_type,salary_text,summary,description,apply_url,company_logo_url,industry,seniority,posted_at,external_id"
      );

    if (parsed.kind === "uuid") {
      query = query.eq("id", parsed.id);
    } else {
      query = query.eq("source", parsed.source).eq("external_id", parsed.externalId);
    }

    const { data: row, error } = await query.maybeSingle();
    if (!error && row) {
      return rowToExternal(row as Record<string, unknown>);
    }
  }

  // Live fallback when sync has not written rows yet
  if (parsed.kind === "composite") {
    try {
      const live = await getLiveCollectedJobsCached();
      const hit = live.find(
        (j) => j.source === (parsed.source as AggregatorSource) && j.external_id === parsed.externalId
      );
      if (hit) return collectedToExternal(hit);
    } catch {
      // ignore
    }
  }

  return null;
}

/** Public teaser text safe to show (and put in JobPosting) when full body is gated. */
export function jobSeoDescription(listing: {
  title: string;
  company_name: string;
  summary: string | null;
  description: string;
  location: string | null;
}): string {
  const summary = listing.summary?.trim();
  if (summary) return summary.slice(0, 160);
  const desc = listing.description?.trim();
  if (desc) return desc.replace(/\s+/g, " ").slice(0, 160);
  const loc = listing.location?.trim();
  return loc
    ? `${listing.title} at ${listing.company_name} — ${loc}. Apply via Changer Fusions job board.`
    : `${listing.title} at ${listing.company_name}. Apply via Changer Fusions job board.`;
}
