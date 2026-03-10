"use client";

import { useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";

type ResearchSource = {
  id: number;
  title: string;
  url: string;
};

type ResearchResult = {
  answer: string;
  sources: ResearchSource[];
};

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to run research.");
      }

      const data = (await res.json()) as ResearchResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while researching. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-50">
      <section className="container-custom section-padding pb-16">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Research Hub
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            Ask any question and we&apos;ll pull in{" "}
            <span className="font-semibold text-primary-300">
              real-time web insights
            </span>{" "}
            and summarize them into an easy-to-digest answer, with{" "}
            <span className="font-semibold text-primary-300">
              sources you can verify
            </span>
            .
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-lg shadow-slate-950/40"
          >
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10 text-primary-300">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Latest trends in digital marketing for Kenyan SMEs, 2026"
                className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-slate-50 placeholder:text-slate-500 px-2 py-2"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Researching…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Ask
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-left text-slate-500">
              Flow: Your question → Live web results → AI summary → Answer with
              clickable sources.
            </p>
          </form>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 text-red-100 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-6 flex items-center gap-3 text-sm text-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-primary-300" />
              <span>Searching the web and drafting your summary…</span>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-5 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                {result.answer}
              </div>

              {result.sources?.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-100 mb-3">
                    Sources
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {result.sources.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-300 hover:text-primary-200 underline decoration-primary-500/60 decoration-1 underline-offset-2"
                        >
                          <span className="font-mono text-[11px] text-slate-400">
                            [{source.id}]
                          </span>
                          <span>{source.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-slate-500">
                    Always review sources directly before making important
                    decisions. This tool surfaces live web content and an AI
                    summary to speed up your research.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

