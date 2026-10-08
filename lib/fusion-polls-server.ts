import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { mapPollRow, POLL_DETAIL_SELECT, POLL_LIST_SELECT, isMissingPollTable, type FusionPollRecord, type PollDbRow } from "@/lib/fusion-polls";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const readKey = serviceKey || supabaseAnonKey;
const configured = Boolean(supabaseUrl && readKey && !supabaseUrl.includes("placeholder.supabase.co"));
const supabase = configured
  ? createClient(supabaseUrl, readKey, {
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

async function loadFusionPoll(id: string): Promise<FusionPollRecord | null> {
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
}

export const getFusionPoll = cache(loadFusionPoll);

const OPTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CastVoteResult =
  | { ok: true; already: boolean; optionId: string | null; record: FusionPollRecord }
  | { ok: false; status: number; error: string };

function rpcPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as { ok?: boolean; already?: boolean; error?: string };
}

function isMissingRpc(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function|schema cache|cast_fusion_poll_vote/i.test(message);
}

function isMissingVoteLedger(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /fusion_poll_votes/i.test(message);
}

function voteStatus(message: string) {
  if (/not available|not on this poll/i.test(message)) return 404;
  if (/not open|has ended/i.test(message)) return 409;
  return 400;
}

async function recordedOptionId(pollId: string, voterKey: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fusion_poll_votes")
    .select("option_id")
    .eq("poll_id", pollId)
    .eq("voter_key", voterKey)
    .maybeSingle();
  if (error || !data?.option_id) return null;
  return String(data.option_id);
}

async function incrementOptionVotes(optionId: string) {
  if (!supabase) return false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await supabase.from("fusion_poll_options").select("votes").eq("id", optionId).maybeSingle();
    if (current.error || !current.data) return false;
    const votes = Number(current.data.votes ?? 0);
    const updated = await supabase
      .from("fusion_poll_options")
      .update({ votes: votes + 1 })
      .eq("id", optionId)
      .eq("votes", votes)
      .select("id");
    if (updated.error) return false;
    if ((updated.data ?? []).length > 0) return true;
  }
  return false;
}

export async function castFusionPollVote(pollId: string, optionId: string, voterKey: string): Promise<CastVoteResult> {
  if (!supabase) return { ok: false, status: 503, error: "Polls are not connected." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pollId) || !OPTION_ID.test(optionId) || voterKey.length < 8) {
    return { ok: false, status: 400, error: "That vote could not be recorded." };
  }

  const rpc = await supabase.rpc("cast_fusion_poll_vote", {
    p_poll_id: pollId,
    p_option_id: optionId,
    p_voter_key: voterKey,
  });
  if (rpc.error) {
    if (!isMissingRpc(rpc.error)) {
      console.error("cast_fusion_poll_vote:", rpc.error.message);
      return { ok: false, status: 500, error: "That vote could not be recorded." };
    }
  } else {
    const payload = rpcPayload(rpc.data);
    if (payload?.ok === true) {
      const record = await loadFusionPoll(pollId);
      if (!record) return { ok: false, status: 404, error: "This poll is not available." };
      const chosen = payload.already ? await recordedOptionId(pollId, voterKey) : optionId;
      return { ok: true, already: Boolean(payload.already), optionId: chosen, record };
    }
    const error = payload?.error || "That vote could not be recorded.";
    return { ok: false, status: payload ? voteStatus(error) : 500, error };
  }

  const poll = await supabase.from("fusion_polls").select("status").eq("id", pollId).maybeSingle();
  if (poll.error || !poll.data) return { ok: false, status: 404, error: "This poll is not available." };
  if (poll.data.status !== "Live") {
    return {
      ok: false,
      status: 409,
      error: poll.data.status === "Scheduled" ? "This poll is not open yet." : "This poll has ended.",
    };
  }
  const option = await supabase.from("fusion_poll_options").select("id").eq("id", optionId).eq("poll_id", pollId).maybeSingle();
  if (option.error || !option.data) return { ok: false, status: 404, error: "That choice is not on this poll." };

  const existing = await recordedOptionId(pollId, voterKey);
  if (existing) {
    const record = await loadFusionPoll(pollId);
    if (!record) return { ok: false, status: 404, error: "This poll is not available." };
    return { ok: true, already: true, optionId: existing, record };
  }

  const ledger = await supabase.from("fusion_poll_votes").insert({ poll_id: pollId, option_id: optionId, voter_key: voterKey });
  const ledgerMissing = Boolean(ledger.error && isMissingVoteLedger(ledger.error));
  if (ledger.error && !ledgerMissing) {
    if (ledger.error.code === "23505") {
      const record = await loadFusionPoll(pollId);
      if (!record) return { ok: false, status: 404, error: "This poll is not available." };
      return { ok: true, already: true, optionId: (await recordedOptionId(pollId, voterKey)) ?? optionId, record };
    }
    console.error("fusion_poll_votes:", ledger.error.message);
    return { ok: false, status: 500, error: "That vote could not be recorded." };
  }

  const incremented = await incrementOptionVotes(optionId);
  if (!incremented) {
    if (!ledgerMissing) await supabase.from("fusion_poll_votes").delete().eq("poll_id", pollId).eq("voter_key", voterKey);
    return { ok: false, status: 500, error: "That vote could not be recorded." };
  }
  const record = await loadFusionPoll(pollId);
  if (!record) return { ok: false, status: 404, error: "This poll is not available." };
  return { ok: true, already: false, optionId, record };
}
