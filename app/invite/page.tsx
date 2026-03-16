"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, MapPin, Send } from "lucide-react";

type InviteData = {
  reference: string;
  defaultName: string | null;
  defaultEmail: string | null;
  defaultPhone: string | null;
  defaultNotes: string | null;
  eventTitle: string | null;
  eventDate: string | null;
  eventLocation: string | null;
};

export default function InvitePage() {
  const searchParams = useSearchParams();
  const ref = (searchParams?.get("ref") ?? "").trim();

  const [loading, setLoading] = useState(!!ref);
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setError("This invite link is missing a reference.");
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invite?ref=${encodeURIComponent(ref)}`);
        const json = (await res.json()) as InviteData & { error?: string };
        if (!res.ok || json.error) {
          throw new Error(json.error || "Invite not found");
        }
        if (!cancelled) {
          setData(json);
          setName(json.defaultName ?? "");
          setEmail(json.defaultEmail ?? "");
          setPhone(json.defaultPhone ?? "");
          setNotes(json.defaultNotes ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load invite");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, name, email, phone, notes }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to save your details");
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save your details");
    } finally {
      setSubmitting(false);
    }
  };

  const eventDateLabel =
    data?.eventDate ? new Date(data.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom max-w-xl py-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 text-left">
          Confirm your details
        </h1>
        <p className="text-gray-600 mb-6 text-left">
          This helps the organisers prepare your invitation and guest list. Your QR code in the email will still be used at the gate.
        </p>

        {loading && (
          <div className="mt-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading your invite…</p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-6 space-y-6">
            {data.eventTitle && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Event
                </div>
                <div className="text-lg font-bold text-gray-900">{data.eventTitle}</div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-700 mt-1">
                  {eventDateLabel && (
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-600" />
                      <span>{eventDateLabel}</span>
                    </div>
                  )}
                  {data.eventLocation && (
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      <span>{data.eventLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="E.g. dietary requirements, accessibility needs, or special instructions."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 text-sm ${
                  submitting ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? "Saving…" : "Submit details"}
                <Send className="w-4 h-4" />
              </button>
              {submitted && (
                <p className="text-xs text-green-700 mt-1">
                  Thank you, your details have been saved. You can still use the QR code in your email at the gate.
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

