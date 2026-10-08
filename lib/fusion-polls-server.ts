import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { mapPollRow, POLL_DETAIL_SELECT, POLL_LIST_SELECT, isMissingPollTable, type FusionPollRecord, type PollDbRow } from "@/lib/fusion-polls";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const configured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder.supabase.co"));
const supabase = configured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(4000) }),
      },
    })
  : null;

function withoutPhotoColumn(select: string) {
  return select.replace(",image_url", "");
}

export const listFusionPolls = cache(async (): Promise<FusionPollRecord[] | null> => {
  if (!supabase) return null;
  const first = await supabase.from("fusion_polls").select(POLL_LIST_SELECT).order("created_at", { ascending: false });
  const retry =
    first.error && /image_url/i.test(first.error.message)
      ? await supabase.from("fusion_polls").select(withoutPhotoColumn(POLL_LIST_SELECT)).order("created_at", { ascending: false })
      : null;
  const error = retry ? retry.error : first.error;
  const data = (retry ? retry.data : first.data) as PollDbRow[] | null;
  if (error) {
    if (!isMissingPollTable(error)) console.error("fusion_polls list:", error.message);
    return null;
  }
  return (data ?? []).map(mapPollRow);
});

export const getFusionPoll = cache(async (id: string): Promise<FusionPollRecord | null> => {
  if (!supabase) return null;
  const first = await supabase.from("fusion_polls").select(POLL_DETAIL_SELECT).eq("id", id).maybeSingle();
  const retry =
    first.error && /image_url/i.test(first.error.message)
      ? await supabase.from("fusion_polls").select(withoutPhotoColumn(POLL_DETAIL_SELECT)).eq("id", id).maybeSingle()
      : null;
  const error = retry ? retry.error : first.error;
  const data = (retry ? retry.data : first.data) as PollDbRow | null;
  if (error || !data) {
    if (error && !isMissingPollTable(error)) console.error("fusion_polls get:", error.message);
    return null;
  }
  return mapPollRow(data);
});
