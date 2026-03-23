import { NextRequest, NextResponse } from "next/server";
import { getSyncAdminClient, syncAggregatedJobs } from "@/lib/job-aggregators/sync-to-db";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.JOB_AGGREGATE_SYNC_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * Ingest remote jobs into aggregated_jobs (collectors → DB).
 * Vercel Cron: set CRON_SECRET; schedule hits this route with Authorization: Bearer <secret>.
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/internal/job-aggregate/sync
 */
export async function GET(req: NextRequest) {
  return runSync(req);
}

export async function POST(req: NextRequest) {
  return runSync(req);
}

async function runSync(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSyncAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server missing Supabase service role" }, { status: 500 });
  }

  try {
    const report = await syncAggregatedJobs(admin);
    return NextResponse.json(report, { status: report.ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
