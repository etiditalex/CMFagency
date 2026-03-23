import type { CollectorResult, CollectedJob } from "../types";
import { mapLooseJobType, stripHtml } from "../text";

const MAX_JOBS = 120;

type RemoteOkRow = {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  company_logo?: string;
  location?: string;
  date?: string;
  description?: string;
  url?: string;
  tags?: string[];
};

export async function collectRemoteOk(): Promise<CollectorResult> {
  const source = "remoteok" as const;
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: {
        "User-Agent": "CMFAgencyJobBoard/1.0 (aggregator; contact: https://changerfusions.com)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { source, jobs: [], error: `Remote OK HTTP ${res.status}` };

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return { source, jobs: [], error: "Remote OK: invalid JSON" };

    const jobs: CollectedJob[] = [];
    for (const row of data as RemoteOkRow[]) {
      if (!row?.position || !row.slug) continue;
      const id = String(row.id ?? row.slug);
      const descHtml = String(row.description ?? "");
      const plain = stripHtml(descHtml, 8000);
      const summary = stripHtml(descHtml, 280) || null;
      const apply = row.url?.startsWith("http")
        ? row.url
        : `https://remoteok.com/remote-jobs/${row.slug}`;

      jobs.push({
        source,
        external_id: id,
        title: String(row.position).trim(),
        company_name: String(row.company ?? "Company").trim(),
        location: row.location ? String(row.location).trim() : null,
        employment_type: mapLooseJobType("full_time"),
        salary_text: null,
        summary,
        description: plain || summary || row.position,
        apply_url: apply,
        company_logo_url: row.company_logo?.startsWith("http") ? row.company_logo : null,
        industry: Array.isArray(row.tags) && row.tags.length ? row.tags.slice(0, 3).join(", ") : null,
        seniority: null,
        posted_at: row.date ? new Date(row.date).toISOString() : null,
      });
      if (jobs.length >= MAX_JOBS) break;
    }

    return { source, jobs, error: null };
  } catch (e) {
    return { source, jobs: [], error: e instanceof Error ? e.message : "Remote OK fetch failed" };
  }
}
