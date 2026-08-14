import { NextRequest, NextResponse } from "next/server";

import { runVotingResultsCron } from "@/lib/run-voting-results-cron";
import { requirePortalMember } from "@/lib/teams-work-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Admin/manager: generate both official PDFs and email them to the voting admin now.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePortalMember(req);
  if ("error" in auth) return auth.error;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  try {
    const result = await runVotingResultsCron(auth.admin, { force: true });
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to email results";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
