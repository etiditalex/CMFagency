import { NextResponse } from "next/server";

import { getCampaignPageData } from "@/lib/campaign-page-data";

/** Vote totals must not be edge-cached; stale tallies vs `/vote-counts` (no-store) looked like fluctuating votes/revenue. */
const CACHE_HDR_LIVE = { "Cache-Control": "no-store, max-age=0" };
const CACHE_HDR_STATIC = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" };

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const result = await getCampaignPageData(slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { headers: result.live ? CACHE_HDR_LIVE : CACHE_HDR_STATIC });
}
