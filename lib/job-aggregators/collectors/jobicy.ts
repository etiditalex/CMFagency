import type { CollectorResult, CollectedJob } from "../types";
import { mapLooseJobType, stripHtml } from "../text";

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobGeo?: string;
  jobLevel?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
};

type JobicyResponse = { jobs?: JobicyJob[] };

export async function collectJobicy(): Promise<CollectorResult> {
  const source = "jobicy" as const;
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=80", {
      headers: {
        "User-Agent": "CMFAgencyJobBoard/1.0 (aggregator)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { source, jobs: [], error: `Jobicy HTTP ${res.status}` };

    const body = (await res.json()) as JobicyResponse;
    const list = body.jobs ?? [];
    const jobs: CollectedJob[] = [];

    for (const row of list) {
      if (!row?.id || !row.jobTitle || !row.url) continue;
      const descHtml = String(row.jobDescription ?? row.jobExcerpt ?? "");
      const plain = stripHtml(descHtml, 8000);
      const summary =
        stripHtml(String(row.jobExcerpt ?? ""), 280) || stripHtml(descHtml, 280) || null;
      const industry =
        Array.isArray(row.jobIndustry) && row.jobIndustry.length
          ? row.jobIndustry.map((s) => stripHtml(String(s), 80)).join(", ")
          : null;

      jobs.push({
        source,
        external_id: String(row.id),
        title: String(row.jobTitle).trim(),
        company_name: String(row.companyName ?? "Company").trim(),
        location: row.jobGeo ? String(row.jobGeo).trim() : null,
        employment_type: mapLooseJobType(row.jobType?.[0]),
        salary_text: null,
        summary,
        description: plain || summary || row.jobTitle,
        apply_url: String(row.url),
        company_logo_url: row.companyLogo?.startsWith("http") ? row.companyLogo : null,
        industry,
        seniority: row.jobLevel ? stripHtml(String(row.jobLevel), 64) : null,
        posted_at: row.pubDate ? new Date(row.pubDate).toISOString() : null,
      });
    }

    return { source, jobs, error: null };
  } catch (e) {
    return { source, jobs: [], error: e instanceof Error ? e.message : "Jobicy fetch failed" };
  }
}
