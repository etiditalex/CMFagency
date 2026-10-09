"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, MoreHorizontal, PieChart, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { isMissingPollTable } from "@/lib/fusion-polls";
import type { LivePollStatus } from "@/components/poll/live-polls-sample";

type SortKey = "created" | "participants" | "deadline";

type PollListItem = {
  id: string;
  title: string;
  status: LivePollStatus;
  deadline: string;
  createdAt: string;
  participants: number;
};

type PollListRow = {
  id: string;
  title: string;
  status: LivePollStatus;
  ends_label: string | null;
  created_at: string;
  topic: string;
  created_by: string | null;
  fusion_poll_options?: { votes: number | null }[] | null;
};

const STATUSES: Array<"all" | LivePollStatus> = ["all", "Live", "Ended", "Scheduled"];

function formatCreated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDeadline(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(`${trimmed.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
    }
  }
  return trimmed;
}

function mapRow(row: PollListRow): PollListItem {
  const participants = (row.fusion_poll_options ?? []).reduce((total, option) => total + Number(option.votes ?? 0), 0);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    deadline: row.ends_label ?? "",
    createdAt: row.created_at,
    participants,
  };
}

function statusClass(status: LivePollStatus) {
  if (status === "Live") return "bg-fx-successBg text-fx-success";
  if (status === "Scheduled") return "bg-fx-warnBg text-fx-warn";
  return "bg-canvas text-ink-muted";
}

export default function PollingFxPollList() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isPollOnly } = usePortal();
  const [polls, setPolls] = useState<PollListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("created");
  const [menuId, setMenuId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    let query = supabase
      .from("fusion_polls")
      .select("id,title,status,ends_label,created_at,topic,created_by,fusion_poll_options(votes)")
      .eq("topic", "poll")
      .order("created_at", { ascending: false });
    if (!isAdmin && user?.id) query = query.eq("created_by", user.id);
    const { data, error: err } = await query;
    if (err) {
      const offline = /fetch failed|Failed to fetch|NetworkError/i.test(err.message);
      setMissingTable(isMissingPollTable(err));
      setError(
        offline
          ? "Supabase is not reachable from this environment. Polls created on the public page will list here once this dashboard is connected."
          : err.message,
      );
      if (!quiet) setPolls([]);
    } else {
      setMissingTable(false);
      setError(null);
      setPolls(((data ?? []) as PollListRow[]).map(mapRow));
    }
    setLoading(false);
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/poll/login");
      return;
    }
    if (!isAdmin && !isPollOnly) {
      setLoading(false);
      return;
    }
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [authLoading, isAdmin, isAuthenticated, isPollOnly, isPortalMember, load, portalLoading, router, user]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || (!isAdmin && !isPollOnly)) return null;

  const visible = polls
    .filter((poll) => status === "all" || poll.status === status)
    .sort((a, b) => {
      if (sort === "participants") return b.participants - a.participants;
      if (sort === "deadline") return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      return a.createdAt < b.createdAt ? 1 : -1;
    });

  return (
    <div className="text-left">
      <h1 className="sr-only">Poll</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/poll/create"
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create poll
        </Link>
        <div className="flex items-center gap-2 self-end">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              aria-expanded={filterOpen}
              aria-label="Filter polls"
              onClick={() => setFilterOpen((open) => !open)}
              className={`grid h-10 w-10 place-items-center rounded-md border bg-white text-ink ${status === "all" ? "border-hairline" : "border-primary-600 text-primary-700"}`}
            >
              <Filter className="h-4 w-4" aria-hidden />
            </button>
            {filterOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-36 rounded-lg border border-hairline bg-white p-1 shadow-lg">
                {STATUSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setStatus(item);
                      setFilterOpen(false);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${status === item ? "bg-brand-muted text-brand" : "text-ink hover:bg-canvas"}`}
                  >
                    {item === "all" ? "All" : item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="poll-sort">
            Sort polls
          </label>
          <select
            id="poll-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-10 rounded-md border border-hairline bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary-400"
          >
            <option value="created">Created</option>
            <option value="participants">Participants</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </div>

      {error ? <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {missingTable ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          The polling tables are not in the database yet. Run <strong>database/ticketing_voting_mvp_patch_96_fusion_polls.sql</strong> in the Supabase SQL editor, then reload this page.
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[minmax(0,1.6fr)_7rem_8rem_7rem_2.5rem] px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <span>Polls</span>
            <span className="text-center">Participants</span>
            <span className="text-center">Deadline</span>
            <span className="text-center">Status</span>
            <span className="sr-only">Actions</span>
          </div>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-white px-4 py-10 text-center text-sm text-ink-muted">
              No polls yet. Create a poll and it will show up here.
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((poll) => (
                <li key={poll.id} className="grid grid-cols-[minmax(0,1.6fr)_7rem_8rem_7rem_2.5rem] items-center rounded-xl border border-hairline bg-white px-4 py-3">
                  <Link href={`/poll/live/${poll.id}`} className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-positive text-white">
                      <PieChart className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{poll.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{formatCreated(poll.createdAt)}</span>
                    </span>
                  </Link>
                  <span className="text-center text-sm font-medium text-ink">{poll.participants}</span>
                  <span className="text-center text-sm text-ink-muted">{formatDeadline(poll.deadline)}</span>
                  <span className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(poll.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {poll.status}
                    </span>
                  </span>
                  <span className="relative flex justify-end">
                    <button
                      type="button"
                      aria-label={`Actions for ${poll.title}`}
                      aria-expanded={menuId === poll.id}
                      onClick={() => setMenuId((current) => (current === poll.id ? null : poll.id))}
                      className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                    {menuId === poll.id ? (
                      <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-hairline bg-white p-1 shadow-lg">
                        <Link href={`/poll/live/${poll.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-canvas" onClick={() => setMenuId(null)}>
                          View results
                        </Link>
                        {isAdmin ? (
                          <Link href={`/dashboard/polling-fx?edit=${poll.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-canvas" onClick={() => setMenuId(null)}>
                            Edit in Polling Fx
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
