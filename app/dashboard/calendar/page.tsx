"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { calendarParts, type AwardCalendarStop } from "@/lib/award-calendar";
import { supabase } from "@/lib/supabase";

type StopRow = {
  id: string;
  event_date: string;
  host: string;
  note: string | null;
  published: boolean;
};

const EMPTY_FORM = { id: "", eventDate: "", host: "", note: "", published: true };

function mapRow(row: StopRow): AwardCalendarStop {
  return {
    id: row.id,
    eventDate: String(row.event_date).slice(0, 10),
    host: row.host,
    note: row.note,
    published: row.published,
  };
}

function missingTable(message: string) {
  return /award_calendar_stops|schema cache|does not exist/i.test(message);
}

export default function DashboardCalendarPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTable, setNeedsTable] = useState(false);
  const [stops, setStops] = useState<AwardCalendarStop[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("events")) router.replace("/dashboard");
  }, [authLoading, hasFeature, isAuthenticated, isPortalMember, portalLoading, router, user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("award_calendar_stops")
      .select("id, event_date, host, note, published")
      .order("event_date", { ascending: true });
    if (fetchError) {
      setStops([]);
      setNeedsTable(missingTable(fetchError.message));
      setError(
        missingTable(fetchError.message)
          ? "The calendar table is not in the database yet. Apply database/ticketing_voting_mvp_patch_107_award_calendar.sql in Supabase, then reload this page."
          : fetchError.message
      );
    } else {
      setNeedsTable(false);
      setStops(((data ?? []) as StopRow[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hasFeature("events")) return;
    load();
  }, [hasFeature, load]);

  const save = async () => {
    const host = form.host.trim();
    const note = form.note.trim();
    if (!form.eventDate || !host) {
      setError("Add a date and a host region and county.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      event_date: form.eventDate,
      host,
      note: note || null,
      published: form.published,
    };
    const result = form.id
      ? await supabase.from("award_calendar_stops").update(payload).eq("id", form.id)
      : await supabase.from("award_calendar_stops").insert(payload);
    setSaving(false);
    if (result.error) {
      setNeedsTable(missingTable(result.error.message));
      setError(
        missingTable(result.error.message)
          ? "Apply database/ticketing_voting_mvp_patch_107_award_calendar.sql in Supabase before saving dates."
          : result.error.message
      );
      return;
    }
    setForm(EMPTY_FORM);
    await load();
  };

  const remove = async (stop: AwardCalendarStop) => {
    if (!confirm(`Remove ${calendarParts(stop.eventDate).label} — ${stop.host}?`)) return;
    const { error: deleteError } = await supabase.from("award_calendar_stops").delete().eq("id", stop.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (form.id === stop.id) setForm(EMPTY_FORM);
    setStops((current) => current.filter((item) => item.id !== stop.id));
  };

  const togglePublished = async (stop: AwardCalendarStop) => {
    const { error: updateError } = await supabase
      .from("award_calendar_stops")
      .update({ published: !stop.published })
      .eq("id", stop.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStops((current) =>
      current.map((item) => (item.id === stop.id ? { ...item, published: !item.published } : item))
    );
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("events")) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="border-b border-hairline pb-3 text-left text-xl font-bold text-[#1a2332] md:text-2xl">
            Calendar
          </h2>
          <p className="mt-1 max-w-3xl text-left text-gray-600">
            Dates saved here appear on the public events calendar and the 2028 calendar. A hidden date stays off both pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/2028-calendar"
            target="_blank"
            className="inline-flex items-center gap-2 font-semibold text-primary-700 hover:text-primary-800"
          >
            <ExternalLink className="h-4 w-4" />
            Open 2028 calendar
          </Link>
          <Link
            href="/events"
            target="_blank"
            className="inline-flex items-center gap-2 font-semibold text-primary-700 hover:text-primary-800"
          >
            <ExternalLink className="h-4 w-4" />
            Open events calendar
          </Link>
        </div>
      </div>

      {error ? <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <form
        className="mt-6 grid gap-4 border border-hairline bg-white p-5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="block text-sm font-semibold text-gray-700">
          Date
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          Host region and county
          <input
            type="text"
            required
            maxLength={160}
            value={form.host}
            placeholder="Coast — Kilifi"
            onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700 md:col-span-2">
          Note
          <textarea
            maxLength={500}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            className="mt-1 min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
          />
          Show on the public calendar
        </label>
        <div className="flex items-center justify-end gap-3">
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
              className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving || needsTable}
            className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-4 py-2 font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : form.id ? "Save date" : "Add date"}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-hairline bg-white">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Date</th>
                <th className="px-6 py-3 font-bold text-gray-600">Host region and county</th>
                <th className="px-6 py-3 font-bold text-gray-600">Note</th>
                <th className="px-6 py-3 font-bold text-gray-600">Public</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stops.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={5}>
                    No dates saved yet.
                  </td>
                </tr>
              ) : (
                stops.map((stop) => {
                  const parts = calendarParts(stop.eventDate);
                  return (
                    <tr key={stop.id} className="border-b border-gray-100">
                      <td className="px-6 py-4 font-semibold text-gray-900">{parts.label}</td>
                      <td className="px-6 py-4 text-gray-700">{stop.host}</td>
                      <td className="px-6 py-4 text-gray-700">{stop.note || "—"}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => togglePublished(stop)}
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            stop.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {stop.published ? "Shown" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                id: stop.id,
                                eventDate: stop.eventDate,
                                host: stop.host,
                                note: stop.note ?? "",
                                published: stop.published,
                              })
                            }
                            className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(stop)}
                            className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
