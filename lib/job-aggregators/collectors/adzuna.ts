import type { CollectorResult, CollectedJob } from "../types";
import { mapLooseJobType, stripHtml } from "../text";

type AdzunaResult = {
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  company?: { display_name?: string };
  location?: { display_name?: string }[];
  category?: { label?: string };
  contract_type?: string;
  id?: string | number;
};

type AdzunaResponse = { results?: AdzunaResult[] };

/**
 * Adzuna requires ADZUNA_APP_ID + ADZUNA_APP_KEY.
 * ADZUNA_COUNTRY defaults to `ke` (Kenya); use `gb`, `us`, etc. per https://developer.adzuna.com/
 */
export async function collectAdzuna(): Promise<CollectorResult> {
  const source = "adzuna" as const;
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = process.env.ADZUNA_APP_KEY?.trim();
  const country = (process.env.ADZUNA_COUNTRY ?? "ke").trim().toLowerCase() || "ke";

  if (!appId || !appKey) {
    return { source, jobs: [], error: null };
  }

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "40",
      what: "remote",
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CMFAgencyJobBoard/1.0 (aggregator)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { source, jobs: [], error: `Adzuna HTTP ${res.status}` };

    const body = (await res.json()) as AdzunaResponse;
    const list = body.results ?? [];
    const jobs: CollectedJob[] = [];

    for (const row of list) {
      const extId = row.id != null ? String(row.id) : null;
      if (!extId || !row.title || !row.redirect_url) continue;
      const desc = stripHtml(String(row.description ?? ""), 8000);
      const summary = stripHtml(String(row.description ?? ""), 280) || null;
      const loc =
        Array.isArray(row.location) && row.location[0]?.display_name
          ? String(row.location[0].display_name)
          : null;

      jobs.push({
        source,
        external_id: extId,
        title: String(row.title).trim(),
        company_name: String(row.company?.display_name ?? "Company").trim(),
        location: loc,
        employment_type: mapLooseJobType(row.contract_type),
        salary_text: null,
        summary,
        description: desc || summary || row.title,
        apply_url: String(row.redirect_url),
        company_logo_url: null,
        industry: row.category?.label ? String(row.category.label) : null,
        seniority: null,
        posted_at: row.created ? new Date(row.created).toISOString() : null,
      });
    }

    return { source, jobs, error: null };
  } catch (e) {
    return { source, jobs: [], error: e instanceof Error ? e.message : "Adzuna fetch failed" };
  }
}
