import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runAllCollectors } from "./collect-all";
import type { CollectedJob } from "./types";

const CHUNK = 40;

function toRow(j: CollectedJob) {
  return {
    source: j.source,
    external_id: j.external_id,
    title: j.title,
    company_name: j.company_name,
    location: j.location,
    employment_type: j.employment_type,
    salary_text: j.salary_text,
    summary: j.summary,
    description: j.description,
    apply_url: j.apply_url,
    company_logo_url: j.company_logo_url,
    industry: j.industry,
    seniority: j.seniority,
    posted_at: j.posted_at,
  };
}

export type SyncReport = {
  ok: boolean;
  totalUpserted: number;
  sources: Record<
    string,
    {
      collected: number;
      error: string | null;
    }
  >;
  dbError: string | null;
};

export async function syncAggregatedJobs(admin: SupabaseClient): Promise<SyncReport> {
  const results = await runAllCollectors();
  const report: SyncReport = {
    ok: true,
    totalUpserted: 0,
    sources: {},
    dbError: null,
  };

  const allJobs: CollectedJob[] = [];

  for (const r of results) {
    report.sources[r.source] = {
      collected: r.jobs.length,
      error: r.error,
    };
    allJobs.push(...r.jobs);
  }

  for (let i = 0; i < allJobs.length; i += CHUNK) {
    const chunk = allJobs.slice(i, i + CHUNK).map(toRow);
    const { error } = await admin.from("aggregated_jobs").upsert(chunk, {
      onConflict: "source,external_id",
    });
    if (error) {
      report.dbError = error.message;
      report.ok = false;
      return report;
    }
    report.totalUpserted += chunk.length;
  }

  return report;
}

export function getSyncAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
