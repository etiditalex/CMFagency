"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Vote } from "lucide-react";


/** Used if `/api/voting-schedule` is unavailable (migration not applied yet). */
const FALLBACK_VOTING_START_MS = new Date("2026-04-01T00:00:00+03:00").getTime();

function formatVotingOpensInNairobi(isoMs: number): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoMs));
  } catch {
    return "soon";
  }
}

type ContestantRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

type CategoryRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  contestants: ContestantRow[] | null;
};

export default function AllVotingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [votingStartMs, setVotingStartMs] = useState<number>(FALLBACK_VOTING_START_MS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voting-schedule");
        const j = (await res.json()) as { voting_starts_at?: string | null };
        const iso = j?.voting_starts_at;
        if (cancelled) return;
        if (iso) {
          const t = Date.parse(iso);
          if (!Number.isNaN(t)) setVotingStartMs(t);
        }
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/voting/all-categories", { cache: "no-store" });
        const j = (await res.json()) as { categories?: CategoryRow[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(j.error ?? `Unable to load voting categories (${res.status})`);
        }
        setCategories(Array.isArray(j.categories) ? j.categories : []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error)?.message ?? "Unable to load voting categories.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const votingLocked = Date.now() < votingStartMs;
  const votingOpensLabel = formatVotingOpensInNairobi(votingStartMs);

  const totalContestants = useMemo(
    () => categories.reduce((n, c) => n + (c.contestants?.length ?? 0), 0),
    [categories]
  );

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voting categories…</p>
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

  if (error) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-red-100 text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">No public voting categories</h1>
            <p className="text-gray-600 mt-2">
              There are no active voting campaigns available right now. Check back later or use a category link from the
              organizer.
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
          {categories.map((cat) => (
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
                          <Image src={c.image_url} alt={c.name} fill className="object-cover" />
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
