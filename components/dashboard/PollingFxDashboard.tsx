"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, ClipboardList, ExternalLink, ImagePlus, MapPin, MessageCircle, Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { isMissingPollTable, mapPollRow, POLL_LIST_SELECT, type FusionPollRecord, type PollComment, type PollDbRow } from "@/lib/fusion-polls";
import type { LivePollStatus, LivePollTopic } from "@/components/poll/live-polls-sample";

const TOPICS: { id: LivePollTopic; label: string }[] = [
  { id: "brand", label: "Brand" },
  { id: "politics", label: "Politics" },
  { id: "presidential", label: "Presidential" },
  { id: "gubernatorial", label: "Gubernatorial" },
  { id: "senatorial", label: "Senatorial" },
  { id: "events", label: "Events" },
  { id: "opinion", label: "Opinion" },
  { id: "campaign", label: "Campaign" },
];

const STATUSES: LivePollStatus[] = ["Live", "Ended", "Scheduled"];
const REGIONS = ["Nairobi", "Coast", "Central", "Rift Valley", "Western", "Nyanza", "Eastern", "North Eastern"];
const COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Kilifi", "Uasin Gishu", "Embu", "Wajir", "Kericho", "Kakamega", "Machakos"];

type OptionDraft = { name: string; label: string; votes: string; imageUrl: string };

type PollForm = {
  id: string;
  title: string;
  question: string;
  topic: LivePollTopic;
  status: LivePollStatus;
  region: string;
  county: string;
  ends: string;
  spoiledVotes: string;
  options: OptionDraft[];
};

const EMPTY_FORM: PollForm = {
  id: "",
  title: "",
  question: "",
  topic: "senatorial",
  status: "Live",
  region: "Eastern",
  county: "Embu",
  ends: "",
  spoiledVotes: "0",
    options: [
    { name: "", label: "No party", votes: "0", imageUrl: "" },
    { name: "", label: "No party", votes: "0", imageUrl: "" },
  ],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fieldClass() {
  return "w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-400";
}

export default function PollingFxDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFromList = searchParams.get("edit");
  const editApplied = useRef(false);
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [polls, setPolls] = useState<FusionPollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | LivePollStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PollForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const first = await supabase.from("fusion_polls").select(POLL_LIST_SELECT).order("created_at", { ascending: true });
    const retry =
      first.error && /image_url/i.test(first.error.message)
        ? await supabase.from("fusion_polls").select(POLL_LIST_SELECT.replace(",image_url", "")).order("created_at", { ascending: true })
        : null;
    const err = retry ? retry.error : first.error;
    const data = (retry ? retry.data : first.data) as PollDbRow[] | null;
    if (retry && !err) setError("Candidate photos need database/ticketing_voting_mvp_patch_97_fusion_poll_option_images.sql in the Supabase SQL editor.");
    if (err) {
      const offline = /fetch failed|Failed to fetch|NetworkError/i.test(err.message);
      setMissingTable(isMissingPollTable(err));
      setError(
        offline
          ? "Supabase is not reachable from this environment. Use the project URL and anon key, then run database/ticketing_voting_mvp_patch_96_fusion_polls.sql."
          : err.message,
      );
      setPolls([]);
    } else {
      setMissingTable(false);
      setPolls(((data ?? []) as PollDbRow[]).map(mapPollRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, router, user]);

  useEffect(() => {
    if (authLoading || portalLoading || !isAuthenticated || !user || !isAdmin) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAdmin, isAuthenticated, load, portalLoading, user]);

  useEffect(() => {
    if (authLoading || portalLoading || !isAuthenticated || !user || !isAdmin) return;
    let stop = false;
    const applyVotes = (rows: { id: string; poll_id: string; votes: number | null }[]) => {
      const votes = new Map(rows.map((row) => [String(row.id), Number(row.votes ?? 0)]));
      setPolls((current) =>
        current.map((record) => {
          let changed = false;
          const options = record.options.map((option) => {
            if (!option.id || !votes.has(option.id)) return option;
            const next = votes.get(option.id) ?? option.votes;
            if (next === option.votes) return option;
            changed = true;
            return { ...option, votes: next };
          });
          if (!changed) return record;
          return {
            ...record,
            options,
            poll: { ...record.poll, totalVotes: options.reduce((total, option) => total + option.votes, 0) },
          };
        }),
      );
    };
    const tick = async () => {
      const { data, error: err } = await supabase.from("fusion_poll_options").select("id,poll_id,votes");
      if (stop || err || !data) return;
      applyVotes(data);
    };
    const timer = window.setInterval(() => {
      void tick();
    }, 4000);
    const channel = supabase
      .channel("polling-fx-live-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fusion_poll_options" }, () => {
        void tick();
      })
      .subscribe();
    return () => {
      stop = true;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [authLoading, isAdmin, isAuthenticated, portalLoading, user]);

  const visible = polls.filter((record) => statusFilter === "all" || record.poll.status === statusFilter);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError(null);
  }

  useEffect(() => {
    if (editApplied.current || loading || !editFromList) return;
    const record = polls.find((item) => item.poll.id === editFromList);
    if (!record) return;
    editApplied.current = true;
    openEdit(record);
  }, [editFromList, loading, polls]);

  function openEdit(record: FusionPollRecord) {
    setEditingId(record.poll.id);
    setForm({
      id: record.poll.id,
      title: record.poll.title,
      question: record.question,
      topic: record.poll.topic,
      status: record.poll.status,
      region: record.poll.region,
      county: record.poll.county,
      ends: record.poll.ends,
      spoiledVotes: String(record.poll.spoiledVotes),
      options: record.options.map((option) => ({
        name: option.name,
        label: option.label,
        votes: String(option.votes),
        imageUrl: option.imageUrl ?? "",
      })),
    });
    setFormOpen(true);
    setError(null);
  }

  async function openComments(pollId: string) {
    setActiveId(pollId);
    setCommentsLoading(true);
    const { data, error: err } = await supabase
      .from("fusion_poll_comments")
      .select("id,author_name,body,created_at")
      .eq("poll_id", pollId)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else {
      setComments(
        (data ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.author_name),
          body: String(row.body),
          at: String(row.created_at),
        })),
      );
    }
    setCommentsLoading(false);
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setForm((current) => {
      const options = [...current.options];
      const existing = options[index];
      if (!existing) return current;
      options[index] = { ...existing, ...patch };
      return { ...current, options };
    });
  }

  async function uploadCandidatePhoto(index: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be 5MB or smaller.");
      return;
    }
    setUploadingIndex(index);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/campaign-image/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !json.url) throw new Error(json.error || "Photo upload failed");
      updateOption(index, { imageUrl: json.url });
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "Photo upload failed");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    const question = form.question.trim();
    const id = editingId ?? slugify(form.id || title);
    const options = form.options
      .map((option) => ({
        name: option.name.trim(),
        label: option.label.trim() || TOPICS.find((topic) => topic.id === form.topic)?.label || "Candidate",
        votes: Math.max(0, Math.round(Number(option.votes) || 0)),
        imageUrl: option.imageUrl.trim(),
      }))
      .filter((option) => option.name);
    if (!title || !question || !id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      setError("Add a title, a question, and a short id such as embu-senate.");
      return;
    }
    if (options.length < 2) {
      setError("Add at least two candidates. Use Add candidate for every extra person.");
      return;
    }
    const spoiledVotes = Math.max(0, Math.round(Number(form.spoiledVotes) || 0));
    const topicLabel = TOPICS.find((topic) => topic.id === form.topic)?.label ?? form.topic;
    const row = {
      title,
      question,
      topic: form.topic,
      topic_label: topicLabel,
      status: form.status,
      region: form.region,
      county: form.county,
      ends_label: form.ends.trim(),
      spoiled_votes: spoiledVotes,
    };
    setSaving(true);
    setError(null);
    const pollWrite = editingId
      ? await supabase.from("fusion_polls").update(row).eq("id", editingId)
      : await supabase.from("fusion_polls").insert({ ...row, id });
    if (pollWrite.error) {
      setError(pollWrite.error.message);
      setSaving(false);
      return;
    }
    const cleared = await supabase.from("fusion_poll_options").delete().eq("poll_id", id);
    if (cleared.error) {
      setError(cleared.error.message);
      setSaving(false);
      return;
    }
    const inserted = await supabase.from("fusion_poll_options").insert(
      options.map((option, index) => ({
        poll_id: id,
        name: option.name,
        label: option.label,
        image_url: option.imageUrl || null,
        votes: option.votes,
        sort_order: index,
      })),
    );
    if (inserted.error) {
      setError(
        /image_url/i.test(inserted.error.message)
          ? "Candidate photos need database/ticketing_voting_mvp_patch_97_fusion_poll_option_images.sql in the Supabase SQL editor."
          : inserted.error.message,
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    setFormOpen(false);
    await load();
  }

  async function onDelete(record: FusionPollRecord) {
    if (!confirm(`Delete “${record.poll.title}”? Comments on this poll are removed with it.`)) return;
    const { error: err } = await supabase.from("fusion_polls").delete().eq("id", record.poll.id);
    if (err) {
      setError(err.message);
      return;
    }
    if (activeId === record.poll.id) setActiveId(null);
    setPolls((current) => current.filter((item) => item.poll.id !== record.poll.id));
  }

  async function onDeleteComment(commentId: string) {
    const { error: err } = await supabase.from("fusion_poll_comments").delete().eq("id", commentId);
    if (err) {
      setError(err.message);
      return;
    }
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setPolls((current) =>
      current.map((record) =>
        record.poll.id === activeId ? { ...record, commentCount: Math.max(0, record.commentCount - 1) } : record,
      ),
    );
  }

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  const active = polls.find((record) => record.poll.id === activeId) ?? null;

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="border-b border-hairline pb-3 text-left text-xl font-bold text-[#1a2332] md:text-2xl">Polling Fx</h2>
          <p className="mt-1 max-w-3xl text-left text-gray-600">
            A new poll is published as soon as you save it. While its status is Live, visitors can vote and the public results update as each vote is recorded.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-4 py-2 font-semibold text-white hover:bg-primary-800"
        >
          <Plus className="h-4 w-4" />
          New poll
        </button>
      </div>

      {error ? <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {missingTable ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          The polling tables are not in the database yet. Run <strong>database/ticketing_voting_mvp_patch_96_fusion_polls.sql</strong> in the Supabase SQL editor, then reload this page.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((status) => {
          const count = status === "all" ? polls.length : polls.filter((record) => record.poll.status === status).length;
          const selected = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-2 font-semibold ${selected ? "bg-primary-600 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {status === "all" ? "All" : status} ({count})
            </button>
          );
        })}
      </div>

      {formOpen ? (
        <form onSubmit={onSave} className="mt-6 space-y-4 rounded-2xl border border-hairline bg-white p-4 sm:p-5">
          <h3 className="text-lg font-bold text-[#1a2332]">{editingId ? "Edit poll" : "New poll"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Title
              <input className={`${fieldClass()} mt-1`} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Poll id
              <input
                className={`${fieldClass()} mt-1`}
                value={editingId ?? form.id}
                disabled={Boolean(editingId)}
                placeholder="embu-senate"
                onChange={(event) => setForm({ ...form, id: event.target.value })}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-gray-700">
            Question
            <textarea className={`${fieldClass()} mt-1`} rows={2} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-semibold text-gray-700">
              Topic
              <select className={`${fieldClass()} mt-1`} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value as LivePollTopic })}>
                {TOPICS.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Status
              <select className={`${fieldClass()} mt-1`} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LivePollStatus })}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Region
              <select className={`${fieldClass()} mt-1`} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              County
              <select className={`${fieldClass()} mt-1`} value={form.county} onChange={(event) => setForm({ ...form, county: event.target.value })}>
                {COUNTIES.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Live publishes this poll immediately. Visitors vote on the public page, and those totals update here and on the results page. Choose Scheduled or Ended when voting should stay closed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Ends
              <input className={`${fieldClass()} mt-1`} value={form.ends} placeholder="6 Oct 2026, 21:42" onChange={(event) => setForm({ ...form, ends: event.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Spoiled votes
              <input className={`${fieldClass()} mt-1`} inputMode="numeric" value={form.spoiledVotes} onChange={(event) => setForm({ ...form, spoiledVotes: event.target.value })} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Candidates</p>
                <p className="text-xs text-gray-500">Add as many people as the poll needs. Each one can have a photo.</p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-700"
                onClick={() => setForm({ ...form, options: [...form.options, { name: "", label: "", votes: "0", imageUrl: "" }] })}
              >
                <Plus className="h-4 w-4" />
                Add candidate
              </button>
            </div>
            {form.options.map((option, index) => (
              <div key={index} className="rounded-xl border border-hairline p-3">
                <div className="flex items-start gap-3">
                  <label className="grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-primary-200 bg-primary-50 text-primary-700">
                    {option.imageUrl ? (
                      <img src={option.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5" aria-hidden />
                    )}
                    <span className="sr-only">Upload photo for candidate {index + 1}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadCandidatePhoto(index, file);
                      }}
                    />
                  </label>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_8rem_6rem]">
                    <input className={fieldClass()} placeholder="Name" aria-label={`Candidate ${index + 1} name`} value={option.name} onChange={(event) => updateOption(index, { name: event.target.value })} />
                    <input className={fieldClass()} placeholder="Party or label" aria-label={`Candidate ${index + 1} label`} value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} />
                    <input className={fieldClass()} inputMode="numeric" placeholder="Votes" aria-label={`Candidate ${index + 1} votes`} value={option.votes} onChange={(event) => updateOption(index, { votes: event.target.value })} />
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-negative"
                    onClick={() => setForm({ ...form, options: form.options.filter((_, optionIndex) => optionIndex !== index) })}
                  >
                    Remove
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {uploadingIndex === index ? "Uploading photo…" : option.imageUrl ? "Photo added. Choose another file to replace it." : "Photo"}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || uploadingIndex !== null} className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save poll"}
            </button>
            <button type="button" className="rounded-md border border-gray-200 px-4 py-2 font-semibold text-gray-700" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((record) => (
          <article key={record.poll.id} className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
            <div className="bg-gradient-to-r from-primary-500 to-primary-800 px-4 pb-4 pt-3.5 text-white">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 shrink-0" aria-hidden />
                <span className="rounded-full bg-primary-950/70 px-2 py-0.5 text-[10px] font-bold tracking-wide">{record.poll.status.toUpperCase()}</span>
              </div>
              <h3 className="mt-3 truncate text-sm font-extrabold uppercase tracking-wide">{record.poll.title}</h3>
              <p className="mt-1 text-sm font-medium text-white/80">{record.poll.topicLabel}</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="flex items-start gap-2 text-[13px] text-primary-900/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                <span>{record.poll.region} → {record.poll.county} → All → All</span>
              </p>
              <p className="flex items-start gap-2 text-[13px] text-primary-900/80">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                <span>Ends: {record.poll.ends || "—"}</span>
              </p>
              <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-950">
                    <ClipboardList className="h-4 w-4 text-primary-600" aria-hidden />
                    Vote Statistics
                  </span>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-hidden />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-hairline bg-white px-2 py-2.5 text-center">
                    <div className="text-xl font-bold tabular-nums text-primary-600">{record.poll.totalVotes.toLocaleString("en-KE")}</div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">Total Votes</div>
                  </div>
                  <div className="rounded-lg border border-hairline bg-white px-2 py-2.5 text-center">
                    <div className="text-xl font-bold tabular-nums text-negative">{record.poll.spoiledVotes.toLocaleString("en-KE")}</div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">Spoiled Votes</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <Link href={record.poll.topic === "poll" ? `/poll/${record.poll.id}` : `/poll/live/${record.poll.id}`} className="inline-flex items-center gap-1 text-primary-700">
                  <ExternalLink className="h-4 w-4" /> View
                </Link>
                <button type="button" className="inline-flex items-center gap-1 text-gray-700" onClick={() => openEdit(record)}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" className="inline-flex items-center gap-1 text-gray-700" onClick={() => openComments(record.poll.id)}>
                  <MessageCircle className="h-4 w-4" /> Comments ({record.commentCount})
                </button>
                <button type="button" className="inline-flex items-center gap-1 text-negative" onClick={() => onDelete(record)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 && !missingTable ? (
        <p className="mt-8 text-sm text-gray-600">No polls in this view yet. Create one and it will show on Live Polls.</p>
      ) : null}

      {active ? (
        <section className="mt-8 rounded-2xl border border-hairline bg-white p-4 sm:p-5" aria-label="Stored comments">
          <h3 className="text-lg font-bold text-[#1a2332]">Comments · {active.poll.title}</h3>
          {commentsLoading ? <p className="mt-3 text-sm text-gray-600">Loading comments…</p> : null}
          {!commentsLoading && comments.length === 0 ? <p className="mt-3 text-sm text-gray-600">No comments stored for this poll yet.</p> : null}
          <ul className="mt-3 divide-y divide-primary-100">
            {comments.map((comment) => (
              <li key={comment.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-primary-950">{comment.name}</p>
                  <p className="mt-1 text-sm text-ink">{comment.body}</p>
                </div>
                <button type="button" className="shrink-0 text-sm font-semibold text-negative" onClick={() => onDeleteComment(comment.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
