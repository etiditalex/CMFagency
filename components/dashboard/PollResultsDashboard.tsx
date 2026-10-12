"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { isMissingPollTable, mapPollRow, POLL_LIST_SELECT, type FusionPollRecord, type PollDbRow } from "@/lib/fusion-polls";
import { supabase } from "@/lib/supabase";

type VoterRow = {
  id: string;
  pollId: string;
  name: string;
  email: string;
  choice: string;
  at: string;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PollResultsDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [polls, setPolls] = useState<FusionPollRecord[]>([]);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const first = await supabase.from("fusion_polls").select(POLL_LIST_SELECT).order("created_at", { ascending: false });
    const retry =
      first.error && /image_url/i.test(first.error.message)
        ? await supabase.from("fusion_polls").select(POLL_LIST_SELECT.replace(",image_url", "")).order("created_at", { ascending: false })
        : null;
    const pollError = retry ? retry.error : first.error;
    const pollData = (retry ? retry.data : first.data) as PollDbRow[] | null;
    if (pollError) {
      setPolls([]);
      setVoters([]);
      setError(isMissingPollTable(pollError) ? "Live polls are not set up in this database yet." : pollError.message);
      setLoading(false);
      return;
    }

    const records = ((pollData ?? []) as PollDbRow[]).map(mapPollRow).filter((record) => record.poll.topic !== "poll");
    const names = new Map(records.flatMap((record) => record.options.map((option) => [option.id, option.name])));
    const votes = await supabase
      .from("fusion_poll_votes")
      .select("id,poll_id,voter_name,voter_email,option_id,created_at")
      .not("voter_email", "is", null)
      .order("created_at", { ascending: false });

    if (votes.error) {
      setPolls(records);
      setVoters([]);
      setError(
        /voter_name|voter_email|schema cache/i.test(votes.error.message)
          ? "Voter details need database/ticketing_voting_mvp_patch_101_fusion_poll_live_voter.sql in the Supabase SQL editor."
          : votes.error.message,
      );
      setLoading(false);
      return;
    }

    setPolls(records);
    setVoters(
      (votes.data ?? [])
        .filter((row) => records.some((record) => record.poll.id === String(row.poll_id)))
        .map((row) => ({
          id: String(row.id),
          pollId: String(row.poll_id),
          name: String(row.voter_name ?? ""),
          email: String(row.voter_email ?? ""),
          choice: names.get(String(row.option_id)) ?? "Choice",
          at: String(row.created_at),
        })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, router, user]);

  useEffect(() => {
    if (authLoading || portalLoading || !isAuthenticated || !user || !isAdmin) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAdmin, isAuthenticated, load, portalLoading, user]);

  useEffect(() => {
    if (!selectedId && polls[0]) setSelectedId(polls[0].poll.id);
  }, [polls, selectedId]);

  const selected = polls.find((record) => record.poll.id === selectedId) ?? null;
  const rows = useMemo(() => voters.filter((voter) => voter.pollId === selectedId), [selectedId, voters]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * 10, safePage * 10 + 10);
  const rangeStart = rows.length === 0 ? 0 : safePage * 10 + 1;
  const rangeEnd = Math.min(rows.length, safePage * 10 + pageRows.length);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <h2 className="border-b border-hairline pb-3 text-left text-xl font-bold text-[#1a2332] md:text-2xl">Poll Results</h2>
      <p className="mt-1 max-w-3xl text-left text-gray-600">
        Names and emails collected when someone votes on a live poll. These stay off the public results page.
      </p>

      {error ? (
        <p className="mt-4 text-sm font-medium text-negative" role="alert">
          {error}
        </p>
      ) : null}

      {polls.length === 0 && !error ? (
        <p className="mt-8 text-sm text-gray-600">No live polls yet. Voter details appear here after a live poll receives a vote.</p>
      ) : null}

      {polls.length > 0 ? (
        <>
          <label className="mt-6 block max-w-xl text-sm font-semibold text-[#1a2332]">
            Poll
            <select
              className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-white px-3 text-base text-ink"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setPage(0);
              }}
            >
              {polls.map((record) => (
                <option key={record.poll.id} value={record.poll.id}>
                  {record.poll.title}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <p className="mt-3 text-sm text-gray-600">
              {selected.poll.topicLabel} · {rows.length.toLocaleString("en-KE")} {rows.length === 1 ? "voter" : "voters"}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="border-b border-hairline bg-primary-50/70 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="w-12 border-r border-hairline px-3 py-3 font-semibold">#</th>
                  <th className="border-r border-hairline px-4 py-3 font-semibold">Name</th>
                  <th className="border-r border-hairline px-4 py-3 font-semibold">Email</th>
                  <th className="border-r border-hairline px-4 py-3 font-semibold">Choice</th>
                  <th className="px-4 py-3 font-semibold">Voted</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-600">
                      No names or emails stored for this poll yet.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((voter, index) => (
                    <tr key={voter.id} className="border-t border-hairline">
                      <td className="border-r border-hairline px-3 py-3 tabular-nums text-ink-muted">{rangeStart + index}</td>
                      <td className="border-r border-hairline px-4 py-3 font-semibold text-primary-950">{voter.name}</td>
                      <td className="border-r border-hairline px-4 py-3 text-ink">{voter.email}</td>
                      <td className="border-r border-hairline px-4 py-3 text-ink">{voter.choice}</td>
                      <td className="px-4 py-3 text-ink-muted">{formatWhen(voter.at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 10 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Rows {rangeStart}–{rangeEnd} of {rows.length.toLocaleString("en-KE")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-white px-4 text-sm font-semibold text-primary-950 disabled:opacity-50"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-white px-4 text-sm font-semibold text-primary-950 disabled:opacity-50"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
