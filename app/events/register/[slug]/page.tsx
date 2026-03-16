"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, MapPin, Send, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

type EventInfo = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  time: string | null;
  location: string | null;
  venue: string | null;
  description: string | null;
  free_registration: boolean;
};

export default function EventRegisterPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Invalid event.");
      return;
    }
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,time,location,venue,description,free_registration")
        .eq("slug", slug)
        .eq("free_registration", true)
        .gte("event_date", today)
        .maybeSingle();
      if (!cancelled) {
        if (error || !data) {
          setError("Event not found or registration is not open.");
          setEvent(null);
        } else {
          setEvent(data as EventInfo);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; reference?: string };
      if (!res.ok) {
        setError(json.error ?? "Registration failed.");
        return;
      }
      setSuccess(true);
    } catch (_) {
      setError("Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const eventDateLabel = event?.event_date
    ? format(new Date(event.event_date), "EEEE, MMMM d, yyyy")
    : null;
  const eventLocation = event
    ? (event.venue && event.location ? `${event.venue}, ${event.location}` : event.location || event.venue)
    : null;

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom max-w-xl py-8">
        <Link
          href="/events/upcoming"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Upcoming Events
        </Link>

        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          Register for this event
        </h1>
        <p className="text-gray-600 mb-6">
          Free registration. You will receive an email invitation with a QR code to show at the entrance.
        </p>

        {loading && (
          <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading event…</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && event && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Event</div>
              <div className="text-lg font-bold text-gray-900">{event.title}</div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-700 mt-2">
                {eventDateLabel && (
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    {eventDateLabel}
                    {event.time && ` · ${event.time}`}
                  </span>
                )}
                {eventLocation && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    {eventLocation}
                  </span>
                )}
              </div>
            </div>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <p className="font-semibold text-green-800">You’re registered.</p>
                <p className="text-green-700 text-sm mt-1">
                  Check your email for an invitation with a QR code. Show it at the entrance on the day.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="e.g. dietary requirements, accessibility needs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 text-sm ${
                    submitting ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? "Submitting…" : "Register"}
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
