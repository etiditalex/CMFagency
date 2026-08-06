"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Vote } from "lucide-react";

import VotingDotMapBackground from "@/components/voting/VotingDotMapBackground";
import type { VotingAllCategoryRow } from "@/lib/voting-all-catalog";
import { canOptimizeRemoteImage } from "@/lib/image-hosts";
import { GENERIC_VOTING_HUB_LOAD_FAILURE } from "@/lib/payment-user-message";
import { formatVotingDateInNairobi } from "@/lib/voting-schedule-public";

/**
 * Full-bleed blue shell shared by every state of the page. Content is always centred;
 * `width="narrow"` is for single-card states (error, closed, not-yet-open).
 */
function VotingHubShell({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 pt-24">
      <VotingDotMapBackground />
      <div className="relative z-10 w-full px-4 py-10 sm:px-6">
        <div className={width === "narrow" ? "mx-auto max-w-2xl" : "mx-auto max-w-5xl"}>{children}</div>
      </div>
    </div>
  );
}

type Props = {
  initialCategories: VotingAllCategoryRow[];
  initialError: string | null;
  /** Server-computed to avoid `Date.now()` hydration mismatches */
  initialVotingLocked: boolean;
  initialVotingClosed: boolean;
  votingStartMs: number;
  votingEndMs: number;
};

export default function AllVotingPageClient({
  initialCategories,
  initialError,
  initialVotingLocked,
  initialVotingClosed,
  votingStartMs,
  votingEndMs,
}: Props) {
  const [votingLocked, setVotingLocked] = useState(initialVotingLocked);
  const [votingClosed, setVotingClosed] = useState(initialVotingClosed);
  const votingOpensLabel = useMemo(() => formatVotingDateInNairobi(votingStartMs), [votingStartMs]);
  const votingClosedLabel = useMemo(() => formatVotingDateInNairobi(votingEndMs), [votingEndMs]);

  useEffect(() => {
    if (!votingLocked) return;
    const tick = () => {
      if (Date.now() >= votingStartMs) setVotingLocked(false);
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [votingLocked, votingStartMs]);

  useEffect(() => {
    if (votingClosed) return;
    const tick = () => {
      if (Date.now() >= votingEndMs) setVotingClosed(true);
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [votingClosed, votingEndMs]);

  const totalContestants = useMemo(
    () => initialCategories.reduce((n, c) => n + (c.contestants?.length ?? 0), 0),
    [initialCategories]
  );

  /**
   * Contestants arrive sorted by vote total, so ranks are assigned by walking the list.
   * Equal totals share a position ("joint 2nd") rather than being ordered arbitrarily.
   */
  const resultsByCategory = useMemo(() => {
    const map = new Map<string, { totalVotes: number; rankById: Map<string, number>; leaderId: string | null }>();

    for (const cat of initialCategories) {
      const scored = (cat.contestants ?? []).filter((c) => c.votes !== null);
      if (scored.length === 0) continue;

      const rankById = new Map<string, number>();
      let rank = 0;
      let previousVotes: number | null = null;

      scored.forEach((c, index) => {
        if (previousVotes === null || c.votes !== previousVotes) {
          rank = index + 1;
          previousVotes = c.votes;
        }
        rankById.set(c.id, rank);
      });

      /** Highlight a front-runner only when one exists outright: no tie for first, and votes cast. */
      const firstPlace = scored.filter((c) => rankById.get(c.id) === 1);
      const leader = firstPlace.length === 1 && (firstPlace[0].votes ?? 0) > 0 ? firstPlace[0] : null;

      map.set(cat.id, {
        totalVotes: scored.reduce((n, c) => n + (c.votes ?? 0), 0),
        rankById,
        leaderId: leader?.id ?? null,
      });
    }

    return map;
  }, [initialCategories]);

  if (initialError) {
    return (
      <VotingHubShell width="narrow">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-red-100 text-red-800">
          {GENERIC_VOTING_HUB_LOAD_FAILURE}
        </div>
      </VotingHubShell>
    );
  }

  if (votingClosed) {
    return (
      <VotingHubShell width="narrow">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-start gap-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-gray-100 items-center justify-center flex-shrink-0">
              <Vote className="w-5 h-5 text-gray-600" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voting closed on {votingClosedLabel}</h1>
              <p className="text-gray-600 mt-2">
                Voting ended at 23:59 East Africa Time and no further votes can be recorded in any category. Thank you
                to everyone who took part.
              </p>
            </div>
          </div>
        </div>
      </VotingHubShell>
    );
  }

  if (votingLocked) {
    return (
      <VotingHubShell width="narrow">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-start gap-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-amber-50 items-center justify-center flex-shrink-0">
              <Vote className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voting opens {votingOpensLabel}</h1>
              <p className="text-gray-600 mt-2">
                This master voting page (all categories) is not open yet. Please come back when voting starts (East
                Africa Time). Individual category links stay the same and will unlock on the same schedule.
              </p>
              <p className="text-sm text-gray-500 mt-3">Your link is valid and will work once voting opens.</p>
            </div>
          </div>
        </div>
      </VotingHubShell>
    );
  }

  if (initialCategories.length === 0) {
    return (
      <VotingHubShell width="narrow">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">No open voting categories</h1>
          <p className="text-gray-600">
            Organisers activate categories when a programme goes live. If you opened this page from a flyer or SMS, use
            the exact category URL you were given—it will load when that campaign is published.
          </p>
          <p className="text-sm text-gray-600">
            For general enquiries:{" "}
            <Link href="/events" className="font-semibold text-primary-600 underline hover:text-primary-700">
              Events
            </Link>
            ,{" "}
            <Link href="/contact" className="font-semibold text-primary-600 underline hover:text-primary-700">
              Contact
            </Link>
            , or{" "}
            <Link href="/" className="font-semibold text-primary-600 underline hover:text-primary-700">
              Home
            </Link>
            .
          </p>
        </div>
      </VotingHubShell>
    );
  }

  return (
    <VotingHubShell>
      <div className="mb-10 flex items-start gap-4">
        <span className="inline-flex w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 items-center justify-center flex-shrink-0">
          <Vote className="w-5 h-5 text-white" />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Vote — all categories</h1>
          <p className="text-primary-100 mt-2 max-w-3xl">
            Browse every open category and jump in to cast votes. Payment and vote rules are unchanged: each category
            has its own price and checkout on its page ({totalContestants} contestant
            {totalContestants !== 1 ? "s" : ""} listed below).
          </p>
        </div>
      </div>

      <div className="space-y-10">
        {initialCategories.map((cat) => {
          const results = resultsByCategory.get(cat.id);
          return (
            <section
              key={cat.id}
              className="bg-white rounded-2xl shadow-2xl shadow-primary-950/30 ring-1 ring-white/20 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{cat.title}</h2>
                  {cat.description ? (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{cat.description}</p>
                  ) : null}
                  {results ? (
                    <p className="text-sm font-semibold text-primary-700 mt-2">
                      {results.totalVotes.toLocaleString("en-KE")} total vote
                      {results.totalVotes !== 1 ? "s" : ""} cast in this category
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-500 mt-2 font-mono">/{cat.slug}</p>
                </div>
                {/* Category pages render live tallies on the server; a forced prefetch of every
                    visible link would run those queries for pages nobody opened. The default
                    prefetch still warms the route shell and `loading.tsx`. */}
                <Link
                  href={`/${encodeURIComponent(cat.slug)}`}
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-100"
                >
                  Open category page
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              {cat.contestants && cat.contestants.length > 0 ? (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.contestants.map((c) => {
                    const rank = results?.rankById.get(c.id);
                    const isLeader = results?.leaderId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-lg border p-3 flex items-center gap-3 min-h-[4.5rem] ${
                          isLeader ? "border-primary-300 bg-primary-50/60" : "border-gray-200 bg-gray-50/50"
                        }`}
                      >
                        {rank !== undefined ? (
                          <div
                            className={`shrink-0 w-7 text-center text-sm font-bold tabular-nums ${
                              isLeader ? "text-primary-700" : "text-gray-400"
                            }`}
                            aria-label={`Position ${rank}`}
                          >
                            {rank}
                          </div>
                        ) : null}
                        {c.image_url ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={c.image_url}
                              alt={c.name}
                              fill
                              unoptimized={!canOptimizeRemoteImage(c.image_url)}
                              className="object-cover"
                              sizes="56px"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 break-words">{c.name}</div>
                          {c.votes !== null ? (
                            <div className="text-sm font-semibold text-primary-600 mt-0.5 tabular-nums">
                              {c.votes.toLocaleString("en-KE")} vote{c.votes !== 1 ? "s" : ""}
                            </div>
                          ) : null}
                          {c.description ? (
                            <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{c.description}</div>
                          ) : null}
                        </div>
                        <Link
                          href={`/${encodeURIComponent(cat.slug)}?c=${encodeURIComponent(c.id)}`}
                          prefetch={false}
                          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                        >
                          Vote
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-600">No contestants in this category yet.</div>
              )}
            </section>
          );
        })}
      </div>
    </VotingHubShell>
  );
}
