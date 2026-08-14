import { NextRequest, NextResponse } from "next/server";

import { requirePortalMember } from "@/lib/teams-work-auth";
import { loadVotingResultsSnapshot } from "@/lib/voting-results-data";
import { buildContestantsPdf, buildWinnersPdf } from "@/lib/voting-results-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Admin/manager download of official voting PDFs.
 * `?kind=winners` (gold category winners) or `?kind=contestants` (full roll).
 */
export async function GET(req: NextRequest) {
  const auth = await requirePortalMember(req);
  if ("error" in auth) return auth.error;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== "winners" && kind !== "contestants") {
    return NextResponse.json({ error: 'Query "kind" must be "winners" or "contestants"' }, { status: 400 });
  }

  try {
    const snapshot = await loadVotingResultsSnapshot(auth.admin);
    const pdf = kind === "winners" ? await buildWinnersPdf(snapshot) : await buildContestantsPdf(snapshot);
    return new NextResponse(Buffer.from(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to build PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
