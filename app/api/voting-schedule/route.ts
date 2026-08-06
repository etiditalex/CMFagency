import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { DEFAULT_SHOW_VOTE_TOTALS, readVotingSettings } from "@/lib/voting-visibility";

/**
 * Public read: when voting campaign pages unlock and close globally, and whether tallies are public.
 */
export async function GET() {
  const jsonCached = (startIso: string | null, endIso: string | null, showVoteTotals: boolean) => {
    const res = NextResponse.json({
      voting_starts_at: startIso,
      voting_ends_at: endIso,
      show_vote_totals: showVoteTotals,
    });
    /** Short TTL so hiding tallies mid-event takes effect quickly. */
    res.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    return res;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return jsonCached(null, null, DEFAULT_SHOW_VOTE_TOTALS);
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const settings = await readVotingSettings(supabase);

  return jsonCached(settings.voting_starts_at, settings.voting_ends_at, settings.show_vote_totals);
}
