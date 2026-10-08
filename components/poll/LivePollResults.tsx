"use client";

import { useState } from "react";
import { LayoutGrid, List, UserRound } from "lucide-react";
import LivePollDiscussion from "@/components/poll/LivePollDiscussion";
import LiveVoteTrends from "@/components/poll/LiveVoteTrends";
import type { PollComment } from "@/lib/fusion-polls";
import type { PollOption, SamplePoll } from "@/components/poll/live-polls-sample";

const RANKS = [
  { tint: "#e7eefb", ink: "#1e58ca" },
  { tint: "#ece8fb", ink: "#5c4db5" },
  { tint: "#e6f7ec", ink: "#1F9D6C" },
  { tint: "#fff1e0", ink: "#e07a00" },
] as const;

type Ballot = {
  title: string;
  question: string;
  options: PollOption[];
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

        <ol className={view === "list" ? "mt-5 space-y-3" : "mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          {ballot.options.map((option, index) => {
            const rank = RANKS[index % RANKS.length];
            const percent = poll.totalVotes === 0 ? 0 : (option.votes / poll.totalVotes) * 100;
            return (
              <li key={option.name} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-primary-100">
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
                    <p className="truncate text-sm font-bold text-primary-950 sm:text-base">{option.name}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{option.label}</p>
                  </div>
                  <div className="live-polls-score shrink-0 text-right">
                    <p className="text-xl font-extrabold leading-none sm:text-2xl" style={{ color: rank.ink }}>
                      {percent.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-[11px] text-ink-muted sm:text-xs">{option.votes.toLocaleString("en-KE")} votes</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <LiveVoteTrends options={ballot.options} />
        <LivePollDiscussion pollId={poll.id} comments={comments} persisted={persisted} />
      </div>
    </section>
  );
}
