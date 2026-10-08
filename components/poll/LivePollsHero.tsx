"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Radio } from "lucide-react";
import LivePollsGrid from "@/components/poll/LivePollsGrid";
import type { SamplePoll } from "@/components/poll/live-polls-sample";
import { supabase } from "@/lib/supabase";
import { mapPollRow, POLL_LIST_SELECT, type PollDbRow } from "@/lib/fusion-polls";

const TOPICS = [
  { id: "brand", label: "Brand" },
  { id: "politics", label: "Politics" },
  { id: "presidential", label: "Presidential" },
  { id: "gubernatorial", label: "Gubernatorial" },
  { id: "senatorial", label: "Senatorial" },
  { id: "events", label: "Events" },
  { id: "opinion", label: "Opinion" },
  { id: "campaign", label: "Campaign" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

const STATUSES = ["Live", "Ended", "Scheduled"] as const;
const REGIONS = [
  "All Regions",
  "Nairobi",
  "Coast",
  "Central",
  "Rift Valley",
  "Western",
  "Nyanza",
  "Eastern",
  "North Eastern",
] as const;
const COUNTIES = [
  "All Counties",
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Kilifi",
  "Uasin Gishu",
  "Embu",
  "Wajir",
  "Kericho",
  "Kakamega",
  "Machakos",
] as const;

const INITIAL = {
  topic: "senatorial" as const,
  query: "",
  status: "Ended" as const,
  region: "All Regions" as const,
  county: "All Counties" as const,
};

export default function LivePollsHero({ polls }: { polls: SamplePoll[] }) {
  const [items, setItems] = useState(polls);
  const [topic, setTopic] = useState<TopicId>(INITIAL.topic);
  const [query, setQuery] = useState(INITIAL.query);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(INITIAL.status);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>(INITIAL.region);
  const [county, setCounty] = useState<(typeof COUNTIES)[number]>(INITIAL.county);
  const [refreshing, setRefreshing] = useState(false);

  const visiblePolls = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((poll) => {
      if (poll.topic !== topic || poll.status !== status) return false;
      if (region !== "All Regions" && poll.region !== region) return false;
      if (county !== "All Counties" && poll.county !== county) return false;
      if (!needle) return true;
      const haystack = `${poll.title} ${poll.county} ${poll.region} ${poll.topic}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [county, items, query, region, status, topic]);

  const refreshPolls = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const { data, error } = await supabase.from("fusion_polls").select(POLL_LIST_SELECT).order("created_at", { ascending: true });
    if (!error && data) setItems((data as PollDbRow[]).map((row) => mapPollRow(row).poll));
    setRefreshing(false);
  };

  const clearFilters = () => {
    setTopic(INITIAL.topic);
    setQuery(INITIAL.query);
    setStatus(INITIAL.status);
    setRegion(INITIAL.region);
    setCounty(INITIAL.county);
  };

  return (
    <>
    <section className="live-polls-hero bg-canvas px-4 pb-2 pt-[var(--site-nav-height)] sm:px-8 sm:pb-4" aria-labelledby="live-polls-heading">
      <div className="mx-auto max-w-5xl py-10 text-center sm:py-14">
        <h1 id="live-polls-heading" className="flex items-center justify-center gap-2.5 text-primary-950 sm:gap-3">
          <Radio className="h-7 w-7 shrink-0 text-primary-600 sm:h-8 sm:w-8" aria-hidden />
          <span>Live Polls &amp; Results</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-muted">
          Live results for politics, brands, events, and opinion polls. Track votes across audiences, campaigns, and the runway.
        </p>

        <div role="tablist" aria-label="Poll topics" className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-9 sm:gap-2.5">
          {TOPICS.map((item) => {
            const selected = item.id === topic;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTopic(item.id)}
                className={`inline-flex min-h-10 items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  selected
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-primary-50 text-primary-800/80 hover:bg-primary-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <form
          className="mt-5 flex flex-col gap-3 lg:mt-6 lg:flex-row lg:items-center"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search polls</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search poll title, brand, or candidate..."
              className="h-11 w-full rounded-lg border border-hairline bg-white px-4 text-sm font-medium text-primary-950 placeholder:text-ink-muted/80 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:shrink-0">
            <FilterSelect label="Status" value={status} options={STATUSES} onChange={setStatus} />
            <FilterSelect label="Region" value={region} options={REGIONS} onChange={setRegion} />
            <FilterSelect label="County" value={county} options={COUNTIES} onChange={setCounty} />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-negative px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c13b3b] lg:w-auto"
          >
            Clear
          </button>
        </form>
      </div>
    </section>
    <LivePollsGrid polls={visiblePolls} refreshing={refreshing} onRefresh={refreshPolls} />
    </>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <label className="relative block lg:w-[9.5rem]">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 w-full appearance-none rounded-lg border border-hairline bg-white pl-3 pr-9 text-sm font-medium text-primary-950 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-700" aria-hidden />
    </label>
  );
}
