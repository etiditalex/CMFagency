"use client";

import Link from "next/link";
import { ArrowLeft, Menu, Radio, Search, Share2 } from "lucide-react";

const RESULTS = [
  { name: "Coast Line", votes: 12, color: "#1e58ca" },
  { name: "Changer Atelier", votes: 5, color: "#5c4db5" },
  { name: "Studio North", votes: 4, color: "#1F9D6C" },
  { name: "Runway Edit", votes: 3, color: "#FF8A00" },
  { name: "Night Market", votes: 1, color: "#3b79da" },
  { name: "Other", votes: 0, color: "#8fb8ef" },
] as const;

const TOTAL = RESULTS.reduce((sum, item) => sum + item.votes, 0);

function pieSlices() {
  let angle = -Math.PI / 2;
  return RESULTS.filter((item) => item.votes > 0).map((item) => {
    const sweep = (item.votes / TOTAL) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const x1 = 50 + 38 * Math.cos(start);
    const y1 = 50 + 38 * Math.sin(start);
    const x2 = 50 + 38 * Math.cos(end);
    const y2 = 50 + 38 * Math.sin(end);
    const mid = start + sweep / 2;
    return {
      name: item.name,
      color: item.color,
      d: `M 50 50 L ${x1} ${y1} A 38 38 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`,
      label: sweep > 1.2,
      x: 50 + 22 * Math.cos(mid),
      y: 50 + 22 * Math.sin(mid),
    };
  });
}

async function sharePoll() {
  const url = `${window.location.origin}/poll/live`;
  if (navigator.share) {
    await navigator.share({ title: "Live poll results", url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(url).catch(() => undefined);
}

export default function CreatePollLiveResults() {
  const slices = pieSlices();

  return (
    <section className="poll-create-showcase mx-auto grid max-w-6xl items-center gap-12 pb-24 pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16" aria-labelledby="poll-create-live-heading">
      <div>
        <h2 id="poll-create-live-heading" className="poll-create-showcase-title">
          Get your results in real-time
        </h2>
        <p className="mt-5">
          The totals on each poll update as votes are recorded. Anyone with the results link can follow the count while the poll is still open.
        </p>
        <p className="mt-4">
          When the poll closes, the final tally stays on the public page for the audience, the brand, or the event.
        </p>
        <Link href="/poll/live" className="mt-6 inline-flex items-center text-sm font-semibold text-primary-200 hover:text-white">
          Explore live polls →
        </Link>
      </div>

      <div className="relative">
        <div className="poll-create-dots pointer-events-none absolute -left-2 top-10 bottom-10 w-8 sm:-left-4" aria-hidden />
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
              <p className="mt-1 text-xs text-white/45">by Amina Hassan · 45 minutes ago</p>

              <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
                <ul className="space-y-2.5">
                  {RESULTS.map((item) => {
                    const percent = TOTAL === 0 ? 0 : (item.votes / TOTAL) * 100;
                    return (
                      <li key={item.name}>
                        <div className="flex items-baseline justify-between gap-2 text-[11px] sm:text-xs">
                          <span className="truncate font-semibold text-white">{item.name}</span>
                          <span className="shrink-0 text-white/55">
                            {percent.toFixed(0)}% ({item.votes} {item.votes === 1 ? "vote" : "votes"})
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${item.votes === 0 ? 0 : Math.max(percent, 6)}%`, backgroundColor: item.color }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <svg viewBox="0 0 100 100" className="mx-auto h-36 w-36" role="img" aria-label="Vote share for the runway poll">
                  {slices.map((slice) => (
                    <path key={slice.name} d={slice.d} fill={slice.color}>
                      <title>{slice.name}</title>
                    </path>
                  ))}
                  {slices.map((slice) =>
                    slice.label ? (
                      <text key={`${slice.name}-label`} x={slice.x} y={slice.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="5.2" fontWeight="700">
                        {slice.name.split(" ")[0]}
                      </text>
                    ) : null,
                  )}
                </svg>
              </div>

              <p className="mt-4 text-xs text-white/55">Total votes: {TOTAL} (from 18 participants)</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/poll/live" className="poll-create-preview-action inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-positive px-3 text-sm font-semibold text-white hover:brightness-110">
                  <Radio className="h-3.5 w-3.5" aria-hidden />
                  Live results
                </Link>
                <a href="#create-poll" className="poll-create-preview-action inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Back to Poll
                </a>
                <button type="button" onClick={() => void sharePoll()} className="poll-create-preview-action inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15">
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
