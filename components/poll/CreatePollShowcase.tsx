"use client";

import Link from "next/link";
import { BarChart3, Check, Menu, Search, Share2 } from "lucide-react";

const OPTIONS = [
  { name: "Changer Atelier", checked: false },
  { name: "Coast Line", checked: true },
  { name: "Studio North", checked: false },
  { name: "Runway Edit", checked: false },
  { name: "Night Market", checked: false },
  { name: "Other", checked: true, muted: true },
] as const;

async function sharePoll() {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title: "Create a Changer Fusions poll", url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(url).catch(() => undefined);
}

export default function CreatePollShowcase() {
  return (
    <section className="poll-create-showcase mx-auto grid max-w-6xl items-center gap-12 pb-20 pt-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16" aria-labelledby="poll-create-showcase-heading">
      <div className="relative">
        <div className="poll-create-dots pointer-events-none absolute -right-2 top-10 bottom-10 w-8 sm:-right-4" aria-hidden />
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0c274f] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-[10px] font-bold text-white">CF</span>
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-primary-950 px-2.5 text-xs text-white/40">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Search
            </div>
            <Menu className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
          </div>

          <div className="p-3 sm:p-4">
            <div className="rounded-xl border border-white/10 border-t-2 border-t-primary-300 bg-primary-900 px-4 py-4">
              <p className="poll-create-preview-question text-base font-bold text-white">Which brand should lead the next runway?</p>
              <p className="mt-1 text-xs text-white/45">by Amina Hassan · 40 minutes ago</p>
              <p className="mt-4 text-xs text-white/45">Choose as many as you like</p>
              <ul className="mt-3 space-y-2">
                {OPTIONS.map((option) => (
                  <li key={option.name} className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${"muted" in option && option.muted ? "bg-white/5 text-white/45" : "text-white/90"}`}>
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${option.checked ? "border-primary-300 bg-primary-600 text-white" : "border-white/30"}`}>
                      {option.checked ? <Check className="h-3 w-3" aria-hidden /> : null}
                    </span>
                    {option.name}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <a href="#create-poll" className="poll-create-preview-action inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary-600 text-sm font-semibold text-white hover:bg-primary-500">
                  Vote
                </a>
                <Link href="/poll/live" className="poll-create-preview-action inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  Results
                </Link>
                <button type="button" onClick={() => void sharePoll()} className="poll-create-preview-action inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15">
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 id="poll-create-showcase-heading" className="poll-create-showcase-title">
          Create engaging polls for free
        </h2>
        <p className="mt-5">
          Whether it is a quick vote in the room or a public read on a brand, a launch, or the next runway, a Changer Fusions poll shows where the majority lands.
        </p>
        <p className="mt-4">
          Share one link and people can vote without an account. Sign in to Fusion Xpress when you want to manage earlier polls, but that is not required to publish.
        </p>
        <a href="#create-poll" className="mt-6 inline-flex items-center text-sm font-semibold text-primary-200 hover:text-white">
          Learn more about how to create your first poll →
        </a>
      </div>
    </section>
  );
}
