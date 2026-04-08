"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Vote } from "lucide-react";

import type { VotingAllCategoryRow } from "@/lib/voting-all-catalog";
import { formatVotingOpensInNairobi } from "@/lib/voting-schedule-public";

type Props = {
  initialCategories: VotingAllCategoryRow[];
  initialError: string | null;
  /** Server-computed to avoid `Date.now()` hydration mismatches */
  initialVotingLocked: boolean;
  votingStartMs: number;
};

export default function AllVotingPageClient({
  initialCategories,
  initialError,
  initialVotingLocked,
  votingStartMs,
}: Props) {
  const [votingLocked, setVotingLocked] = useState(initialVotingLocked);
  const votingOpensLabel = useMemo(() => formatVotingOpensInNairobi(votingStartMs), [votingStartMs]);

  useEffect(() => {
    if (!votingLocked) return;
    const tick = () => {
      if (Date.now() >= votingStartMs) setVotingLocked(false);
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [votingLocked, votingStartMs]);

  const totalContestants = useMemo(
    () => initialCategories.reduce((n, c) => n + (c.contestants?.length ?? 0), 0),
    [initialCategories]
  );

  if (initialError) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-red-100 text-red-800">{initialError}</div>
        </div>
      </div>
    );
  }

  if (votingLocked) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
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
        </div>
      </div>
    );
  }

  if (initialCategories.length === 0) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
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
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-50">
      <div className="container-custom py-10 max-w-5xl">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100 mb-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center flex-shrink-0">
              <Vote className="w-5 h-5 text-primary-700" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Vote — all categories</h1>
              <p className="text-gray-600 mt-2">
                Browse every open category and jump in to cast votes. Payment and vote rules are unchanged: each category
                has its own price and checkout on its page ({totalContestants} contestant
                {totalContestants !== 1 ? "s" : ""} listed below).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {initialCategories.map((cat) => (
            <section key={cat.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{cat.title}</h2>
                  {cat.description ? (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{cat.description}</p>
                  ) : null}
                  <p className="text-xs text-gray-500 mt-2 font-mono">/{cat.slug}</p>
                </div>
                <Link
                  href={`/${encodeURIComponent(cat.slug)}`}
                  prefetch
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-100"
                >
                  Open category page
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              {cat.contestants && cat.contestants.length > 0 ? (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.contestants.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 flex items-center gap-3 min-h-[4.5rem]"
                    >
                      {c.image_url ? (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={c.image_url}
                            alt={c.name}
                            fill
                            unoptimized
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
                        {c.description ? (
                          <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{c.description}</div>
                        ) : null}
                      </div>
                      <Link
                        href={`/${encodeURIComponent(cat.slug)}?c=${encodeURIComponent(c.id)}`}
                        prefetch
                        className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                      >
                        Vote
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-600">No contestants in this category yet.</div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
