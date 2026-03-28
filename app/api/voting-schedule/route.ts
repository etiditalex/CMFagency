import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public read: when voting campaign pages unlock globally.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ voting_starts_at: null }, { status: 200 });
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("fusion_voting_schedule")
    .select("voting_starts_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    const missing =
      msg.includes("does not exist") ||
      msg.includes("fusion_voting_schedule") ||
      String((error as { code?: string }).code ?? "") === "42P01";
    if (missing) return NextResponse.json({ voting_starts_at: null });
    return NextResponse.json({ voting_starts_at: null });
  }

  const iso = (data as { voting_starts_at?: string } | null)?.voting_starts_at ?? null;
  return NextResponse.json({ voting_starts_at: iso });
}
