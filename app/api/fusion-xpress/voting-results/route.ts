import { NextRequest, NextResponse } from "next/server";

import { requirePortalMember } from "@/lib/teams-work-auth";
import { loadVotingResultsSnapshot, toVotingResultsPreview } from "@/lib/voting-results-data";

export const dynamic = "force-dynamic";

/**
 * Admin/manager JSON preview of official voting results (winner first in every category).
 */
export async function GET(req: NextRequest) {
  const auth = await requirePortalMember(req);
  if ("error" in auth) return auth.error;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await loadVotingResultsSnapshot(auth.admin);
    return NextResponse.json(toVotingResultsPreview(snapshot), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load results";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
