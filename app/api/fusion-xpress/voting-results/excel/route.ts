import { NextRequest, NextResponse } from "next/server";

import { requirePortalMember } from "@/lib/teams-work-auth";
import { loadVotingResultsSnapshot } from "@/lib/voting-results-data";
import {
  buildVotingResultsXlsx,
  VOTING_RESULTS_XLSX_MIME,
  type VotingResultsExcelKind,
} from "@/lib/voting-results-excel";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseKind(raw: string | null): VotingResultsExcelKind | null {
  if (!raw || raw === "all") return "all";
  if (raw === "winners" || raw === "contestants") return raw;
  return null;
}

/**
 * Admin/manager Excel download of official voting results.
 * Contestants are grouped by category with the winner (rank 1) first.
 * `?kind=all` (default), `winners`, or `contestants`.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePortalMember(req);
  if ("error" in auth) return auth.error;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kind = parseKind(new URL(req.url).searchParams.get("kind"));
  if (!kind) {
    return NextResponse.json({ error: 'Query "kind" must be "all", "winners", or "contestants"' }, { status: 400 });
  }

  try {
    const snapshot = await loadVotingResultsSnapshot(auth.admin);
    const xlsx = await buildVotingResultsXlsx(snapshot, kind);
    return new NextResponse(new Uint8Array(xlsx.bytes), {
      status: 200,
      headers: {
        "Content-Type": VOTING_RESULTS_XLSX_MIME,
        "Content-Disposition": `attachment; filename="${xlsx.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to build Excel";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
