import type { CollectorResult, CollectedJob } from "../types";
import { mapLooseJobType, stripHtml } from "../text";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo_url?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  publication_date?: string;
  job_type?: string;
  category?: string;
};

type RemotiveResponse = { jobs?: RemotiveJob[] };

export async function collectRemotive(): Promise<CollectorResult> {
  const source = "remotive" as const;
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?limit=100", {
      headers: {
        "User-Agent": "CMFAgencyJobBoard/1.0 (aggregator)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { source, jobs: [], error: `Remotive HTTP ${res.status}` };

    const body = (await res.json()) as RemotiveResponse;
    const list = body.jobs ?? [];
    const jobs: CollectedJob[] = [];

    for (const row of list) {
      if (!row?.id || !row.title || !row.url) continue;
      const desc = stripHtml(String(row.description ?? ""), 8000);
      const summary = stripHtml(String(row.description ?? ""), 280) || null;
      jobs.push({
        source,
        external_id: String(row.id),
        title: String(row.title).trim(),
        company_name: String(row.company_name ?? "Company").trim(),
        location: row.candidate_required_location ? String(row.candidate_required_location).trim() : null,
        employment_type: mapLooseJobType(row.job_type),
        salary_text: row.salary ? String(row.salary).trim() : null,
        summary,
        description: desc || summary || row.title,
        apply_url: String(row.url),
        company_logo_url: row.company_logo_url?.startsWith("http") ? row.company_logo_url : null,
        industry: row.category ? String(row.category) : null,
        seniority: null,
        posted_at: row.publication_date ? new Date(row.publication_date).toISOString() : null,
      });
    }

    return { source, jobs, error: null };
  } catch (e) {
    return { source, jobs: [], error: e instanceof Error ? e.message : "Remotive fetch failed" };
  }
}
