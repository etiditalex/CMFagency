import { NextResponse } from "next/server";

import { getVotingAllCatalog } from "@/lib/voting-all-catalog";

/** CDN + ISR: catalog changes infrequently; vote-order may lag up to this window. */
export const revalidate = 30;

export async function GET() {
  const result = await getVotingAllCatalog();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const res = NextResponse.json({
    categories: result.categories,
    voting_starts_at: result.voting_starts_at,
  });
  if (result.rlsAnon) {
    res.headers.set("X-Voting-Catalog-RLS", "anon");
  }
  return res;
}
