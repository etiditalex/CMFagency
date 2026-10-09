"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";

const OPTIONS = [
  { id: "atelier", name: "Changer Atelier", color: "#1e58ca" },
  { id: "coast", name: "Coast Line", color: "#5c4db5" },
  { id: "studio", name: "Studio North", color: "#1F9D6C" },
  { id: "edit", name: "Runway Edit", color: "#FF8A00" },
  { id: "night", name: "Night Market", color: "#3b79da" },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

const START_VOTES: Record<OptionId, number> = {
  atelier: 42,
  coast: 31,
  studio: 18,
  edit: 14,
  night: 9,
};

export default function LiveDemoPanel() {
  const [selected, setSelected] = useState<OptionId | null>(null);
  const [choice, setChoice] = useState<OptionId | null>(null);
  const [votes, setVotes] = useState<Record<OptionId, number>>(START_VOTES);
  const [showResults, setShowResults] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!showResults) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setVotes((current) => {
        const id = OPTIONS[Math.floor(Math.random() * OPTIONS.length)]?.id ?? "atelier";
        return { ...current, [id]: current[id] + 1 };
      });
    }, 2800);
    return () => window.clearInterval(timer);
  }, [showResults]);

  const total = useMemo(() => OPTIONS.reduce((sum, option) => sum + votes[option.id], 0), [votes]);

  function castVote() {
    if (!selected) {
      setNotice("Choose an option, then vote.");
      return;
    }
    setVotes((current) => {
      const next = { ...current };
      if (choice && choice !== selected) next[choice] = Math.max(0, next[choice] - 1);
      if (choice !== selected) next[selected] += 1;
      return next;
    });
    setChoice(selected);
    setNotice(null);
    setShowResults(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col items-center">
      <h1 className="poll-live-demo-title">Real-Time Polling</h1>
      <p className="poll-live-demo-lead mt-4 max-w-[36rem]">See how easy it is to run a poll with live results.</p>
      <div className="poll-live-demo-card mt-8 w-full max-w-[34rem] overflow-hidden rounded-lg border border-white/10 bg-[#12305c] shadow-[0_24px_70px_rgba(4,12,32,0.45)]">
        <div className="h-1 bg-primary-300" aria-hidden />
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="poll-live-demo-question">Which brand should open the next runway?</h2>

          {showResults ? (
            <div className="mt-6">
              <ul className="space-y-4">
                {OPTIONS.map((option) => {
                  const count = votes[option.id];
                  const share = total > 0 ? (count / total) * 100 : 0;
                  const label = `${share.toFixed(1)}%`;
                  return (
                    <li key={option.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 font-medium text-white">
                          <span className="line-clamp-2 break-words">{option.name}</span>
                          {choice === option.id ? <span className="ml-2 text-xs font-semibold text-primary-200">Your vote</span> : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-white/70">{label}</span>
                      </div>
                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                        role="meter"
                        aria-label={`${option.name} ${label}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(share)}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${share}%`, backgroundColor: option.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="poll-live-demo-note mt-5 text-xs text-white/45">
                {total.toLocaleString("en-KE")} votes on this screen. Nothing is saved to your polls.
              </p>
              <div className="poll-live-demo-actions mt-6">
                <button type="button" onClick={() => setShowResults(false)} className="poll-live-demo-secondary">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                  Hide results
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="poll-live-demo-kicker" id="live-demo-choice-label">
                Make a choice:
              </p>
              <div className="mt-3 grid gap-1" role="radiogroup" aria-labelledby="live-demo-choice-label">
                {OPTIONS.map((option) => {
                  const active = selected === option.id;
                  return (
                    <label key={option.id} className={`poll-live-demo-option ${active ? "is-selected" : ""}`}>
                      <input
                        type="radio"
                        name="live-demo-choice"
                        value={option.id}
                        checked={active}
                        onChange={() => {
                          setSelected(option.id);
                          setNotice(null);
                        }}
                      />
                      <span className="poll-live-demo-radio" aria-hidden />
                      <span>{option.name}</span>
                    </label>
                  );
                })}
              </div>
              {notice ? (
                <p className="poll-live-demo-note mt-3 text-sm font-medium text-[#ffb4b4]" role="alert">
                  {notice}
                </p>
              ) : null}
              <div className="poll-live-demo-actions mt-7">
                <button type="button" onClick={castVote} className="poll-live-demo-vote">
                  Vote
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" onClick={() => setShowResults(true)} className="poll-live-demo-secondary">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                  Show results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
