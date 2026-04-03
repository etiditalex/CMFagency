import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve nominee name for vote receipts (transaction holds contestant_id). */
export async function fetchContestantNameById(
  supabase: SupabaseClient,
  contestantId: string | null | undefined
): Promise<string | undefined> {
  const id = typeof contestantId === "string" ? contestantId.trim() : "";
  if (!id) return undefined;
  const { data } = await supabase.from("contestants").select("name").eq("id", id).maybeSingle();
  const name = (data as { name?: string } | null)?.name?.trim();
  return name || undefined;
}
