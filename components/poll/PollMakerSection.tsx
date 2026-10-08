"use client";

import { useState } from "react";
import Link from "next/link";
import { PieChart, Plus, Search } from "lucide-react";

type MakerMode = "poll" | "opinion";

const NAV = [
  { id: "poll" as const, label: "Create Poll" },
  { id: "opinion" as const, label: "Opinion Polls" },
  { id: "discover" as const, label: "Discover" },
  { id: "results" as const, label: "Results" },
];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-[13px] font-medium text-white/80"
    >
      <span className="min-w-0 leading-snug">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-white" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
            on ? "left-[18px] bg-primary-800" : "left-0.5 bg-white/80"
          }`}
        />
      </span>
    </button>
  );
}

export default function PollMakerSection() {
  const [mode, setMode] = useState<MakerMode>("poll");
  const [options, setOptions] = useState(["", ""]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(false);
  const [duplicateBy, setDuplicateBy] = useState("IP Address");

  const isPoll = mode === "poll";

  return (
    <section className="poll-maker bg-primary-900 py-16 sm:py-20 lg:py-24" aria-labelledby="poll-maker-heading">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 sm:gap-12 sm:px-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-10 lg:px-14 xl:px-20">
        <div className="max-w-xl">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-primary-600 text-white shadow-sm">
            <PieChart className="h-7 w-7" aria-hidden />
          </div>
          <h2 id="poll-maker-heading" className="font-montserrat text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Use our advanced poll maker
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-base">
            A Changer Fusions poll is a vote that helps a group or the public decide an issue. Opinion polls
            are useful when the majority view matters, and not the opinion of each individual participant.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/contact?service=poll"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-500 sm:w-auto"
            >
              Create a poll
            </Link>
            <Link
              href="/voting/all"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-800 px-5 py-2.5 text-[15px] font-semibold text-white/90 transition-colors hover:bg-primary-700 sm:w-auto"
            >
              View example
            </Link>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-primary-800 bg-primary-950 shadow-[0_24px_80px_rgba(10,31,66,0.45)]">
          <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
                <PieChart className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="hidden truncate text-sm font-semibold text-white sm:inline">Changer Fusions</span>
            </div>
            <nav aria-label="Poll maker" className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto sm:gap-4">
              {NAV.map((item) => {
                const active = item.id === mode;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === "poll" || item.id === "opinion") setMode(item.id);
                    }}
                    className={`shrink-0 border-b-2 pb-1 text-[12px] font-semibold sm:text-[13px] ${
                      active
                        ? "border-primary-300 text-white"
                        : "border-transparent text-white/55 hover:text-white"
                    } ${item.id === "discover" || item.id === "results" ? "hidden sm:inline-flex" : ""}`}
                    aria-pressed={item.id === "poll" || item.id === "opinion" ? active : undefined}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <label className="relative hidden w-28 shrink-0 md:block lg:w-36">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" aria-hidden />
              <input
                type="search"
                placeholder="Search"
                className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/35"
              />
            </label>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7">
            <h3 className="poll-maker-title text-center font-montserrat text-xl font-bold text-white sm:text-2xl">
              {isPoll ? "Create a Poll" : "Create an opinion poll"}
            </h3>
            <p className="poll-maker-lead mt-1 text-center text-[13px] text-white/45">
              {isPoll
                ? "Complete the fields below to create your poll."
                : "Complete the fields below to create your opinion poll."}
            </p>

            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-primary-500/60 bg-primary-950 p-4 sm:p-5">
              <label className="block text-left text-[13px] font-semibold text-white/80">
                Title
                <input
                  type="text"
                  placeholder="Type your question here"
                  className="mt-1.5 w-full rounded-md border border-primary-600/70 bg-primary-900 px-3 py-2 text-sm font-medium text-white placeholder:text-white/35"
                />
              </label>

              <label className="mt-4 block text-left text-[13px] font-semibold text-white/80">
                Description <span className="font-medium text-white/40">(optional)</span>
                <textarea
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-md border border-primary-700 bg-primary-900 px-3 py-2 text-sm font-medium text-white placeholder:text-white/35"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-white/80">Answer Options</p>
                <button
                  type="button"
                  onClick={() => setOptions((current) => [...current, "Runway show", "Studio session"])}
                  className="text-[12px] font-semibold text-primary-200 hover:text-primary-100"
                >
                  Paste answers
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    value={option}
                    placeholder={`Option ${index + 1}`}
                    onChange={(event) =>
                      setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                    }
                    className="w-full rounded-md border border-primary-700 bg-primary-800 px-3 py-2 text-sm font-medium text-white placeholder:text-primary-200/70"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setOptions((current) => [...current, ""])}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-700"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add option
              </button>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-[13px] font-semibold text-white">Settings</p>
                <p className="poll-maker-hint mt-1 max-w-md text-[12px] leading-relaxed text-white/45">
                  Choose the following poll settings carefully, as they have a great impact on your poll.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Toggle on={isPrivate} onChange={setIsPrivate} label="Private (only via direct link)" />
                    <Toggle on={allowMultiple} onChange={setAllowMultiple} label="Allow multiple choices" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Toggle on={checkDuplicates} onChange={setCheckDuplicates} label="Duplication Checking" />
                      <span className="text-[12px] font-medium text-primary-200" title="Stops the same person from voting more than once.">
                        What&apos;s this?
                      </span>
                    </div>
                    <label className="block text-left">
                      <span className="sr-only">Duplication method</span>
                      <select
                        value={duplicateBy}
                        onChange={(event) => setDuplicateBy(event.target.value)}
                        className="w-full max-w-[11rem] rounded-md border border-primary-700 bg-primary-800 px-3 py-1.5 text-[13px] font-medium text-white"
                      >
                        <option>IP Address</option>
                        <option>Browser cookie</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
