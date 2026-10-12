"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, UserRound } from "lucide-react";
import LivePollDiscussion from "@/components/poll/LivePollDiscussion";
import LiveVoteTrends from "@/components/poll/LiveVoteTrends";
import type { PollComment, PollOptionRow } from "@/lib/fusion-polls";
import type { PollOption, SamplePoll } from "@/components/poll/live-polls-sample";
import { parseLiveVoteConsent } from "@/lib/poll/live-vote-consent";
import { supabase } from "@/lib/supabase";

const RANKS = [
  { tint: "#e7eefb", ink: "#1e58ca" },
  { tint: "#ece8fb", ink: "#5c4db5" },
  { tint: "#e6f7ec", ink: "#1F9D6C" },
  { tint: "#fff1e0", ink: "#e07a00" },
] as const;

type BallotOption = PollOption & { id?: string; sortOrder?: number };

type Ballot = {
  title: string;
  question: string;
  options: BallotOption[];
};

function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => /[A-Za-z]/.test(part[0] ?? ""))
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="grid h-full grid-cols-2 content-center gap-x-8 px-6 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600/10">
            Changer Fusions
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LivePollResults({
  poll,
  ballot,
  comments,
  persisted,
}: {
  poll: SamplePoll;
  ballot: Ballot;
  comments: PollComment[];
  persisted: boolean;
}) {
  const [view, setView] = useState<"list" | "grid">("list");
  const [options, setOptions] = useState<BallotOption[]>(ballot.options);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const canVote = persisted && poll.status === "Live";

  const ranked = useMemo(
    () => [...options].sort((a, b) => b.votes - a.votes || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [options],
  );
  const totalVotes = ranked.reduce((total, option) => total + option.votes, 0);

  const refresh = useCallback(async () => {
    if (!persisted) return;
    const response = await fetch(`/api/polls/${poll.id}`, { cache: "no-store" });
    const json = (await response.json().catch(() => null)) as { options?: PollOptionRow[]; votedOptionId?: string | null } | null;
    if (!response.ok || !json?.options) return;
    setOptions(json.options);
    if (json.votedOptionId) setMyVote(json.votedOptionId);
  }, [persisted, poll.id]);

  useEffect(() => {
    if (!persisted) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 3000);
    const channel = supabase
      .channel(`live-poll-${poll.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fusion_poll_options", filter: `poll_id=eq.${poll.id}` }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [persisted, poll.id, refresh]);

  useEffect(() => {
    if (!pendingId) return;
    nameRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !votingId) setPendingId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingId, votingId]);

  const pending = options.find((option) => option.id === pendingId) ?? null;

  async function castVote(optionId: string) {
    if (!canVote || votingId || myVote) return;
    const consent = parseLiveVoteConsent({ name: voterName, email: voterEmail, acceptTerms: acceptedTerms });
    if (!consent.ok) {
      setVoteError(consent.error);
      return;
    }
    setVotingId(optionId);
    setVoteError(null);
    const response = await fetch(`/api/polls/${poll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        optionId,
        name: consent.voter.name,
        email: consent.voter.email,
        acceptTerms: true,
      }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string; optionId?: string | null; options?: PollOptionRow[] } | null;
    if (!response.ok || !json?.options) {
      setVoteError(json?.error || "That vote could not be recorded.");
      setVotingId(null);
      return;
    }
    setOptions(json.options);
    if (json.optionId) setMyVote(json.optionId);
    setPendingId(null);
    setVoterName("");
    setVoterEmail("");
    setAcceptedTerms(false);
    setVotingId(null);
  }

  return (
    <section className="live-polls-results bg-white px-4 pb-16 pt-[var(--site-nav-height)] sm:px-8" aria-labelledby="poll-results-heading">
      <div className="mx-auto max-w-5xl py-8 sm:py-10">
        <h1 id="poll-results-heading" className="text-center text-primary-950">
          {ballot.title}
        </h1>

        <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm font-medium text-primary-950 sm:text-[15px]">
            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            <span>{ballot.question}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto" role="group" aria-label="Results layout">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                view === "list"
                  ? "border-primary-200 bg-white text-primary-700 shadow-sm"
                  : "border-transparent bg-primary-50 text-primary-400 hover:text-primary-700"
              }`}
            >
              <List className="h-4 w-4" aria-hidden />
              <span className="sr-only">List view</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                view === "grid"
                  ? "border-primary-200 bg-white text-primary-700 shadow-sm"
                  : "border-transparent bg-primary-50 text-primary-400 hover:text-primary-700"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              <span className="sr-only">Grid view</span>
            </button>
          </div>
        </div>

        {canVote ? (
          <p className="live-polls-note mt-4 text-sm font-medium text-primary-700">
            Open for voting. Add your name and email, and accept the terms, before your vote is recorded.
          </p>
        ) : persisted && poll.status === "Ended" ? (
          <p className="live-polls-note mt-4 text-sm text-ink-muted">This poll has ended. The recorded results stay on this page.</p>
        ) : persisted && poll.status === "Scheduled" ? (
          <p className="live-polls-note mt-4 text-sm text-ink-muted">This poll is scheduled. Voting opens when it is set to Live.</p>
        ) : null}
        {voteError && !pending ? (
          <p className="live-polls-note mt-3 text-sm font-medium text-negative" role="alert">
            {voteError}
          </p>
        ) : null}

        <ol className={view === "list" ? "mt-5 space-y-3" : "mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          {ranked.map((option, index) => {
            const rank = RANKS[index % RANKS.length];
            const percent = totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100;
            const selected = Boolean(option.id && myVote === option.id);
            return (
              <li key={option.id ?? option.name} className={`relative overflow-hidden rounded-2xl bg-white ring-1 ${selected ? "ring-primary-600" : "ring-primary-100"}`}>
                <Watermark />
                <div className={`relative z-10 flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 ${view === "grid" ? "min-h-[5.5rem]" : ""}`}>
                  <div className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1.5 pr-2 sm:gap-3 sm:pr-3" style={{ backgroundColor: rank.tint }}>
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm"
                      style={{ backgroundColor: rank.ink }}
                    >
                      #{index + 1}
                    </span>
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt=""
                        className="h-11 w-11 rounded-full bg-white object-cover sm:h-12 sm:w-12"
                      />
                    ) : (
                      <span
                        className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold sm:h-12 sm:w-12"
                        style={{ color: rank.ink }}
                      >
                        {initials(option.name) || index + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-bold text-primary-950 sm:text-base">{option.name}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{option.label}</p>
                  </div>
                  <div className="live-polls-score shrink-0 text-right">
                    <p className="text-xl font-extrabold leading-none sm:text-2xl" style={{ color: rank.ink }}>
                      {percent.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-[11px] text-ink-muted sm:text-xs">{option.votes.toLocaleString("en-KE")} votes</p>
                    {canVote && option.id ? (
                      <button
                        type="button"
                        className={`live-polls-vote mt-2 inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-lg px-3 text-xs font-semibold ${
                          selected ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200" : "bg-primary-600 text-white hover:bg-primary-500"
                        }`}
                        disabled={Boolean(votingId) || Boolean(myVote)}
                        aria-pressed={selected}
                        onClick={() => {
                          if (!option.id) return;
                          setVoteError(null);
                          setPendingId(option.id);
                        }}
                      >
                        {selected ? "Your vote" : votingId === option.id ? "Saving…" : "Vote"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {pending ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-primary-950/55 p-4 sm:items-center" onClick={() => { if (!votingId) setPendingId(null); }}>
            <form
              className="live-polls-consent w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="live-vote-consent-title"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                if (pending.id) void castVote(pending.id);
              }}
            >
              <h2 id="live-vote-consent-title">Before you vote</h2>
              <p className="mt-2 text-sm text-ink">
                You are voting for <span className="font-semibold text-primary-950">{pending.name}</span>. Your name and email are saved with this opinion poll and are not shown on the results.
              </p>
              <label className="mt-5 block text-sm font-semibold text-primary-950">
                Name
                <input
                  ref={nameRef}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-primary-200 px-3 text-base text-primary-950 outline-none focus:border-primary-600"
                  autoComplete="name"
                  maxLength={80}
                  value={voterName}
                  onChange={(event) => setVoterName(event.target.value)}
                  required
                />
              </label>
              <label className="mt-4 block text-sm font-semibold text-primary-950">
                Email
                <input
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-primary-200 px-3 text-base text-primary-950 outline-none focus:border-primary-600"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={120}
                  value={voterEmail}
                  onChange={(event) => setVoterEmail(event.target.value)}
                  required
                />
              </label>
              <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-primary-200 text-primary-600"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                />
                <span>
                  I accept the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 underline">
                    terms and conditions
                  </a>
                </span>
              </label>
              {voteError ? (
                <p className="mt-3 text-sm font-medium text-negative" role="alert">
                  {voteError}
                </p>
              ) : null}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary-800"
                  disabled={Boolean(votingId)}
                  onClick={() => setPendingId(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
                  disabled={Boolean(votingId)}
                >
                  {votingId ? "Saving…" : "Record vote"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
        <LiveVoteTrends options={ranked} />
        <LivePollDiscussion pollId={poll.id} comments={comments} persisted={persisted} />
      </div>
    </section>
  );
}
