"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, ClipboardList, MapPin, Radio, RefreshCw, Share2 } from "lucide-react";
import type { SamplePoll } from "@/components/poll/live-polls-sample";

export default function LivePollsGrid({
  polls,
  refreshing,
  onRefresh,
}: {
  polls: SamplePoll[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="live-polls-grid bg-canvas px-4 pb-16 sm:px-8 sm:pb-20" aria-label="Poll results">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-600 ring-1 ring-primary-100 transition-colors hover:bg-primary-100"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh Data
          </button>
        </div>
        <p className="live-polls-count mt-5 text-center text-sm text-ink-muted">
          Showing <span>{polls.length}</span> {polls.length === 1 ? "poll" : "polls"}
        </p>

        {polls.length === 0 ? (
          <p className="live-polls-count mx-auto mt-10 max-w-md text-center text-sm text-ink-muted">
            No polls match these filters. Try another topic, status, or county.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {polls.map((poll) => (
              <article key={poll.id} className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
                <div className="bg-gradient-to-r from-primary-500 to-primary-800 px-4 pb-4 pt-3.5 text-white">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="rounded-full bg-primary-950/70 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                      {poll.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="mt-3 truncate">{poll.title}</h3>
                  <p className="mt-1 text-sm font-medium text-white/80">{poll.topicLabel}</p>
                </div>

                <div className="space-y-3 px-4 py-4">
                  <p className="flex items-start gap-2 text-[13px] text-primary-900/80">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                    <span>
                      {poll.region} → {poll.county} → All → All
                    </span>
                  </p>
                  <p className="flex items-start gap-2 text-[13px] text-primary-900/80">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                    <span>Ends: {poll.ends}</span>
                  </p>

                  <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-950">
                        <ClipboardList className="h-4 w-4 text-primary-600" aria-hidden />
                        Vote Statistics
                      </span>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-hidden />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="live-polls-stat rounded-lg border border-hairline bg-white px-2 py-2.5 text-center">
                        <div className="text-xl font-bold tabular-nums text-primary-600">{poll.totalVotes.toLocaleString("en-KE")}</div>
                        <div className="mt-0.5 text-[11px] text-ink-muted">Total Votes</div>
                      </div>
                      <div className="live-polls-stat rounded-lg border border-hairline bg-white px-2 py-2.5 text-center">
                        <div className="text-xl font-bold tabular-nums text-negative">{poll.spoiledVotes.toLocaleString("en-KE")}</div>
                        <div className="mt-0.5 text-[11px] text-ink-muted">Spoiled Votes</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/poll/live/${poll.id}`}
                      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
                    >
                      View Poll Results
                    </Link>
                    <button
                      type="button"
                      aria-label={`Share ${poll.title}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary-200 bg-white text-primary-600 transition-colors hover:bg-primary-50"
                    >
                      <Share2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
