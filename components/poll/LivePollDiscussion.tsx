"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PollComment } from "@/lib/fusion-polls";

function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => /[A-Za-z]/.test(part[0] ?? ""))
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LivePollDiscussion({
  pollId,
  comments: initialComments,
  persisted,
}: {
  pollId: string;
  comments: PollComment[];
  persisted: boolean;
}) {
  const [comments, setComments] = useState<PollComment[]>(initialComments);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim().slice(0, 60);
    const nextBody = body.trim().slice(0, 500);
    if (!nextName || !nextBody) {
      setError("Add your name and a comment.");
      return;
    }
    if (!persisted) {
      setError("This poll is not in the database yet. Open Polling Fx after the polling tables are created, then comments save there.");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("fusion_poll_comments")
      .insert({ poll_id: pollId, author_name: nextName, body: nextBody })
      .select("id,author_name,body,created_at")
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message || "Could not save this comment.");
      return;
    }
    setComments((current) => [
      { id: String(data.id), name: String(data.author_name), body: String(data.body), at: String(data.created_at) },
      ...current,
    ]);
    setName("");
    setBody("");
  }

  return (
    <section className="live-polls-discussion mt-8 overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm" aria-labelledby="poll-discussion-heading">
      <div className="bg-canvas px-4 py-4 sm:px-5">
        <h2 id="poll-discussion-heading" className="flex items-center gap-2 text-primary-950">
          <UserRound className="h-5 w-5 shrink-0" aria-hidden />
          Discussion &amp; Comments
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Share your thoughts about this poll</p>
      </div>

      <div className="border-t border-primary-100 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            Comments
          </h3>
          <p className="live-polls-comment-count shrink-0 text-sm text-ink-muted">
            <span>{comments.length.toLocaleString("en-KE")} total</span>
          </p>
        </div>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            maxLength={60}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary-400"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your comment..."
            aria-label="Your comment"
            maxLength={500}
            rows={3}
            className="w-full resize-y rounded-lg border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary-400"
          />
          {error ? (
            <p className="text-xs font-medium text-negative" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>

        <ul className="mt-5 divide-y divide-primary-100 border-t border-primary-100" aria-live="polite">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                {initials(comment.name) || "CF"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-bold text-primary-950">{comment.name}</p>
                  <p className="text-[11px] text-ink-muted">{formatWhen(comment.at)}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
