"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";

const COLORS = ["#1e58ca", "#5c4db5", "#1F9D6C", "#FF8A00", "#3b79da", "#8fb8ef"];

type PollChoice = {
  id: string;
  name: string;
  votes: number;
};

type Props = {
  pollId: string;
  question: string;
  status: "Live" | "Ended" | "Scheduled";
  options: PollChoice[];
  votedOptionId: string | null;
  openResults?: boolean;
};

export default function CreatedPollCard({ pollId, question, status, options: initialOptions, votedOptionId, openResults = false }: Props) {
  const [options, setOptions] = useState(initialOptions);
  const [selected, setSelected] = useState<string | null>(votedOptionId);
  const [choice, setChoice] = useState<string | null>(votedOptionId);
  const [showResults, setShowResults] = useState(openResults || status !== "Live" || Boolean(votedOptionId));
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const open = status === "Live" && !choice;

  useEffect(() => {
    if (openResults) window.history.replaceState(null, "", `/poll/${pollId}`);
  }, [openResults, pollId]);

  useEffect(() => {
    if (!showResults) return;
    let cancelled = false;
    async function refresh() {
      const response = await fetch(`/api/polls/${pollId}`, { cache: "no-store", credentials: "include" });
      const json = (await response.json().catch(() => null)) as { options?: PollChoice[]; votedOptionId?: string | null } | null;
      if (cancelled || !json?.options) return;
      setOptions(json.options.filter((option) => option.id));
      if (json.votedOptionId) {
        setChoice(json.votedOptionId);
        setSelected(json.votedOptionId);
      }
    }
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollId, showResults]);

  const total = useMemo(() => options.reduce((sum, option) => sum + option.votes, 0), [options]);

  async function castVote() {
    if (!selected) {
      setNotice("Choose an option, then vote.");
      return;
    }
    setSaving(true);
    setNotice(null);
    const response = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: selected }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string; optionId?: string; options?: PollChoice[] } | null;
    setSaving(false);
    if (!response.ok || !json?.options) {
      setNotice(json?.error || "This vote could not be saved.");
      return;
    }
    setOptions(json.options.filter((option) => option.id));
    setChoice(json.optionId ?? selected);
    setSelected(json.optionId ?? selected);
    setShowResults(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col items-center">
      <div className="poll-live-demo-card w-full max-w-[34rem] overflow-hidden rounded-lg border border-white/10 bg-[#12305c] shadow-[0_24px_70px_rgba(4,12,32,0.45)]">
        <div className="h-1 bg-primary-300" aria-hidden />
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <h1 className="poll-live-demo-question">{question}</h1>
          {status !== "Live" ? (
            <p className="poll-live-demo-note mt-3 text-sm text-white/55">
              {status === "Ended" ? "This poll has closed. The tally stays on this page." : "This poll is not open for voting yet."}
            </p>
          ) : null}

          {showResults ? (
            <div className="mt-6">
              <ul className="space-y-4">
                {options.map((option, index) => {
                  const share = total > 0 ? (option.votes / total) * 100 : 0;
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
                          style={{ width: `${share}%`, backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="poll-live-demo-note mt-5 text-xs text-white/45">{total.toLocaleString("en-KE")} votes</p>
              {open ? (
                <div className="poll-live-demo-actions mt-6">
                  <button type="button" onClick={() => setShowResults(false)} className="poll-live-demo-secondary">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                    Hide results
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <p className="poll-live-demo-kicker" id={`choice-${pollId}`}>
                Make a choice:
              </p>
              <div className="mt-3 grid gap-1" role="radiogroup" aria-labelledby={`choice-${pollId}`}>
                {options.map((option) => {
                  const active = selected === option.id;
                  return (
                    <label key={option.id} className={`poll-live-demo-option ${active ? "is-selected" : ""}`}>
                      <input
                        type="radio"
                        name={`poll-${pollId}`}
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
                <button type="button" onClick={() => void castVote()} disabled={saving} className="poll-live-demo-vote">
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
