import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { listingRequiresPaidMembership } from "@/lib/job-board-access";
import { runAllCollectors } from "@/lib/job-aggregators/collect-all";
import type { AggregatorSource, CollectedJob } from "@/lib/job-aggregators/types";

export type UnifiedJobSource = "employer" | AggregatorSource;

export type UnifiedJobListing = {
  source: UnifiedJobSource;
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
  published_at: string | null;
  requires_paid_membership: boolean;
  /** External listings: direct apply on partner site */
  apply_url: string | null;
  attribution: string;
  detail_path: string;
};

function attributionLabel(source: UnifiedJobSource): string {
  switch (source) {
    case "employer":
      return "Changer Fusions";
    case "remoteok":
      return "Remote OK";
    case "remotive":
      return "Remotive";
    case "jobicy":
      return "Jobicy";
    case "adzuna":
      return "Adzuna";
    default:
      return source;
  }
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function parseTs(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v)) return String(v);
  }
  return null;
}

/** Shown when DB has no aggregated rows yet; cached to avoid hammering partner APIs on every request. */
const getLiveCollectedJobsCached = unstable_cache(
  async (): Promise<CollectedJob[]> => {
    const results = await runAllCollectors();
    return results.flatMap((r) => r.jobs);
  },
  ["job-board-live-collected-v1"],
  { revalidate: 900 }
);

function collectedToUnified(j: CollectedJob): UnifiedJobListing {
  return {
    source: j.source,
    id: `${j.source}:${j.external_id}`,
    title: j.title,
    company_name: j.company_name,
    location: j.location,
    employment_type: j.employment_type,
    salary_text: j.salary_text,
    summary: j.summary,
    poster_url: j.company_logo_url,
    industry: j.industry,
    seniority: j.seniority,
    published_at: j.posted_at,
    requires_paid_membership: false,
    apply_url: j.apply_url,
    attribution: attributionLabel(j.source),
    detail_path: j.apply_url,
  };
}

function collectedMatchesQuery(j: CollectedJob, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return true;
  const hay = `${j.title} ${j.company_name} ${j.summary ?? ""} ${j.description} ${j.location ?? ""} ${j.industry ?? ""}`
    .toLowerCase();
  return hay.includes(needle);
}

/**
 * Merged employer-published jobs + aggregated remote APIs, optional keyword search.
 * Flow: DB (+ search index on aggregated_jobs.search_tsv) → unified list for /jobs.
 */
async function getUnifiedJobBoardFeedUncached(options?: {
  search?: string | null;
  limit?: number;
}): Promise<{ jobs: UnifiedJobListing[]; error: string | null }> {
  const limit = Math.min(Math.max(options?.limit ?? 400, 1), 500);
  const q = (options?.search ?? "").trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { jobs: [], error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const jobs: UnifiedJobListing[] = [];

  let employerErr: string | null = null;
  {
    let eq = supabase
      .from("job_listings")
      .select(
        "id,title,company_name,location,employment_type,salary_text,summary,poster_url,industry,seniority,status,published_at,created_at"
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);

    if (q.length >= 2) {
      const e = escapeIlike(q);
      eq = eq.or(`title.ilike.%${e}%,company_name.ilike.%${e}%,summary.ilike.%${e}%`);
    }

    const { data: rows, error } = await eq;
    if (error) {
      if (!/relation|does not exist/i.test(error.message)) {
        employerErr = error.message;
      }
    } else {
      for (const r of rows ?? []) {
        const row = r as Record<string, unknown>;
        const employmentType = String(row.employment_type ?? "");
        jobs.push({
          source: "employer",
          id: String(row.id),
          title: String(row.title ?? ""),
          company_name: String(row.company_name ?? ""),
          location: row.location != null ? String(row.location) : null,
          employment_type: employmentType,
          salary_text: row.salary_text != null ? String(row.salary_text) : null,
          summary: row.summary != null ? String(row.summary) : null,
          poster_url: typeof row.poster_url === "string" && row.poster_url.trim() ? row.poster_url.trim() : null,
          industry: typeof row.industry === "string" && row.industry.trim() ? row.industry.trim() : null,
          seniority: typeof row.seniority === "string" && row.seniority.trim() ? row.seniority.trim() : null,
          published_at: parseTs(row, ["published_at", "created_at"]),
          requires_paid_membership: listingRequiresPaidMembership(employmentType),
          apply_url: null,
          attribution: attributionLabel("employer"),
          detail_path: `/jobs/${row.id}`,
        });
      }
    }
  }

  let aggregatedErr: string | null = null;
  let aggregatedTableMissing = false;
  let externalFromDbCount = 0;
  {
    let aq = supabase
      .from("aggregated_jobs")
      .select(
        "id,source,title,company_name,location,employment_type,salary_text,summary,company_logo_url,industry,seniority,posted_at,created_at,apply_url"
      )
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(250);

    if (q.length >= 2) {
      const e = escapeIlike(q);
      aq = aq.or(`title.ilike.%${e}%,company_name.ilike.%${e}%,summary.ilike.%${e}%,description.ilike.%${e}%`);
    }

    const { data: rows, error } = await aq;
    if (error) {
      if (/relation|does not exist/i.test(error.message)) {
        aggregatedTableMissing = true;
        aggregatedErr = null;
      } else {
        aggregatedErr = error.message;
      }
    } else {
      for (const r of rows ?? []) {
        const row = r as Record<string, unknown>;
        const source = String(row.source ?? "") as AggregatorSource;
        if (!["remoteok", "remotive", "jobicy", "adzuna"].includes(source)) continue;
        externalFromDbCount += 1;
        const logo =
          typeof row.company_logo_url === "string" && row.company_logo_url.trim()
            ? row.company_logo_url.trim()
            : null;
        jobs.push({
          source,
          id: String(row.id),
          title: String(row.title ?? ""),
          company_name: String(row.company_name ?? ""),
          location: row.location != null ? String(row.location) : null,
          employment_type: String(row.employment_type ?? "full_time"),
          salary_text: row.salary_text != null ? String(row.salary_text) : null,
          summary: row.summary != null ? String(row.summary) : null,
          poster_url: logo,
          industry: row.industry != null ? String(row.industry) : null,
          seniority: row.seniority != null ? String(row.seniority) : null,
          published_at: parseTs(row, ["posted_at", "created_at"]),
          requires_paid_membership: false,
          apply_url: typeof row.apply_url === "string" ? row.apply_url : null,
          attribution: attributionLabel(source),
          detail_path: `/jobs/external/${row.id}`,
        });
      }
    }
  }

  // No rows from DB (sync not run yet or empty table): pull partner APIs once per cache window.
  if (externalFromDbCount === 0 && !aggregatedErr) {
    let useLive = false;
    if (q.length < 2) {
      useLive = true;
    } else if (aggregatedTableMissing) {
      useLive = true;
    } else {
      const { count, error: cErr } = await supabase
        .from("aggregated_jobs")
        .select("*", { count: "exact", head: true });
      if (!cErr && (count === 0 || count == null)) useLive = true;
    }

    if (useLive) {
      try {
        const live = await getLiveCollectedJobsCached();
        for (const cj of live) {
          if (q.length >= 2 && !collectedMatchesQuery(cj, q)) continue;
          jobs.push(collectedToUnified(cj));
        }
      } catch {
        // ignore — board still shows employer jobs if any
      }
    }
  }

  const sortKey = (j: UnifiedJobListing) => {
    const t = j.published_at ? Date.parse(j.published_at) : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  jobs.sort((a, b) => sortKey(b) - sortKey(a));

  const trimmed = jobs.slice(0, limit);
  const errMsg = employerErr && aggregatedErr ? `${employerErr}; ${aggregatedErr}` : employerErr || aggregatedErr;
  return { jobs: trimmed, error: errMsg };
}

/** Cache high-traffic default board query (no keyword) across requests. */
const getUnifiedJobBoardFeedDefaultCached = unstable_cache(
  async (limit: number) => getUnifiedJobBoardFeedUncached({ search: null, limit }),
  ["job-board-default-feed-v1"],
  { revalidate: 180 }
);

export async function getUnifiedJobBoardFeed(options?: {
  search?: string | null;
  limit?: number;
}): Promise<{ jobs: UnifiedJobListing[]; error: string | null }> {
  const q = (options?.search ?? "").trim();
  const limit = Math.min(Math.max(options?.limit ?? 400, 1), 500);
  if (!q) {
    return getUnifiedJobBoardFeedDefaultCached(limit);
  }
  return getUnifiedJobBoardFeedUncached({ search: q, limit });
}
