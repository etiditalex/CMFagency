import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { runVotingResultsCron } from "@/lib/run-voting-results-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Hourly (Vercel Cron): once voting has closed at midnight EAT, generate the gold
 * winners PDF and the all-contestants PDF and email them to the voting admin.
 * Runs as a no-op until the close instant, then sends once.
 *
 * Requires Authorization: Bearer CRON_SECRET (Vercel injects when configured).
 * Optional ?force=1 resends even if already emailed (still requires the secret).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runVotingResultsCron(admin, { force });
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    console.error("[cron/voting-results]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
