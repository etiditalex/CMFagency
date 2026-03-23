import { NextRequest, NextResponse } from "next/server";
import { getUnifiedJobBoardFeed } from "@/lib/job-board-feed";

/**
 * Unified job board feed: employer listings + aggregated remote APIs.
 * Query: ?q=keyword (optional). Same data as server-rendered /jobs.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q");
    const { jobs, error } = await getUnifiedJobBoardFeed({ search: q });
    if (error === "Server configuration error") {
      return NextResponse.json({ error }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ jobs, warning: error }, { status: 200 });
    }
    return NextResponse.json({ jobs });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
