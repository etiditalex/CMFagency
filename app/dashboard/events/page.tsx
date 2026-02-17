"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  location: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string;
  created_by?: string | null;
};

export default function DashboardEventsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("events")) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, portalLoading, router, user]);

  useEffect(() => {
    if (!hasFeature("events")) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("fusion_events")
          .select("id,slug,title,event_date,location,category,image_url,created_at,created_by")
          .order("event_date", { ascending: false });

        if (!isFullAdmin && user?.id) {
          query = query.eq("created_by", user.id);
        }

        const { data, error: err } = await query;
        if (err) throw err;
        if (!cancelled) setEvents((data ?? []) as EventRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hasFeature, isFullAdmin, user?.id]);

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = events.filter((e) => {
    if (filter === "upcoming") return e.event_date >= today;
    if (filter === "past") return e.event_date < today;
    return true;
  });

  const handleDelete = async (eventId: string, title: string) => {
    if (!confirm(`Delete event "${title}"? This cannot be undone.`)) return;
    setDeletingId(eventId);
    try {
      const { error: err } = await supabase.from("fusion_events").delete().eq("id", eventId);
      if (err) throw err;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("events")) return null;

  const upcomingCount = events.filter((e) => e.event_date >= today).length;
  const pastCount = events.filter((e) => e.event_date < today).length;

  return (
    <div className="text-left">
      <div className="flex flex-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Events</h2>
          <p className="text-gray-600 mt-1 max-w-3xl text-left">
            Manage events shown on the upcoming events, past events, and all events pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800"
          >
            <Plus className="w-4 h-4" />
            New Event
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { id: "all", label: `All (${events.length})` },
          { id: "upcoming", label: `Upcoming (${upcomingCount})` },
          { id: "past", label: `Past (${pastCount})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as typeof filter)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === t.id ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Event</th>
                <th className="px-6 py-3 font-bold text-gray-600">Date</th>
                <th className="px-6 py-3 font-bold text-gray-600">Location</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={5}>
                    No events yet.{" "}
                    <Link href="/dashboard/events/new" className="text-primary-600 font-semibold hover:underline">
                      Create your first event
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const isUpcoming = e.event_date >= today;
                  return (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {e.image_url && (
                            <img
                              src={e.image_url}
                              alt=""
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <span className="font-semibold text-gray-900">{e.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {format(new Date(e.event_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{e.location ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                            isUpcoming ? "bg-secondary-100 text-secondary-800" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isUpcoming ? "Upcoming" : "Past"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${isUpcoming ? "/events/upcoming" : "/events/past"}/${e.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </Link>
                          <Link
                            href={`/dashboard/events/${e.id}/edit`}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-semibold"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id, e.title)}
                            disabled={deletingId === e.id}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
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
