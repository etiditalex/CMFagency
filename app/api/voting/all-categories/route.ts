import { NextResponse } from "next/server";

import { getVotingAllCatalog } from "@/lib/voting-all-catalog";

/** Do not participate in static / ISR build steps that can hit Vercel’s default timeout. */
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getVotingAllCatalog();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const res = NextResponse.json({
    categories: result.categories,
    voting_starts_at: result.voting_starts_at,
    voting_ends_at: result.voting_ends_at,
  });
  if (result.rlsAnon) {
    res.headers.set("X-Voting-Catalog-RLS", "anon");
  }
  return res;
}
