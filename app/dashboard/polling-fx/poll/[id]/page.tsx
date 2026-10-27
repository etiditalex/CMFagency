"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ResponseRow = {
  id: string;
  name: string;
  email: string;
  choice: string;
  at: string;
};

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

export default function PollResponsesPage() {
  const params = useParams<{ id: string }>();
  const pollId = String(params?.id ?? "");
  const [title, setTitle] = useState("");
  const [collectContact, setCollectContact] = useState(true);
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/polls/${pollId}/responses`, { credentials: "include", cache: "no-store" });
      const json = (await response.json().catch(() => null)) as {
        error?: string;
        title?: string;
        collectContact?: boolean;
        responses?: ResponseRow[];
      } | null;
      if (cancelled) return;
      if (!response.ok || !json) {
        setError(json?.error || "Responses could not be loaded.");
        setLoading(false);
        return;
      }
      setTitle(json.title ?? "");
      setCollectContact(json.collectContact !== false);
      setRows(json.responses ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  return (
    <div className="text-left">
      <Link href="/dashboard/polling-fx/poll" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
        Back to polls
      </Link>
      <h2 className="mt-3 border-b border-hairline pb-3 text-left text-xl font-bold text-[#1a2332] md:text-2xl">
        {title || "Poll responses"}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-gray-600">
        Names and emails entered by people who voted. These stay off the public results page.
      </p>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && !collectContact ? (
        <p className="mt-6 text-sm text-gray-600">This poll was created without collecting names and emails.</p>
      ) : null}

      {!loading && !error && collectContact && rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">No names or emails yet. They appear here after someone votes.</p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline bg-white">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="border-b border-hairline bg-primary-50/70 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Choice</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                  <td className="px-4 py-3 text-ink">{row.email}</td>
                  <td className="px-4 py-3 text-ink">{row.choice}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatWhen(row.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
