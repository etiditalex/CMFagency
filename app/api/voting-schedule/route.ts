import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public read: when voting campaign pages unlock globally.
 */
export async function GET() {
  const jsonCached = (iso: string | null) => {
    const res = NextResponse.json({ voting_starts_at: iso });
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return jsonCached(null);
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("fusion_voting_schedule")
    .select("voting_starts_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return jsonCached(null);
  }

  const iso = (data as { voting_starts_at?: string } | null)?.voting_starts_at ?? null;
  return jsonCached(iso);
}
