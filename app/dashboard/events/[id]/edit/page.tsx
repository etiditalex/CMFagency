"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIES = [
  "Fashion & Modelling",
  "Marketing & Promotional",
  "Corporate Partnership",
  "Educational & Leadership",
  "Student Engagement",
  "Other",
];

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const eventId = useMemo(() => {
    const p = params?.id;
    if (Array.isArray(p)) return p[0] ?? "";
    return String(p ?? "");
  }, [params?.id]);

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("Other");
  const [venue, setVenue] = useState("");
  const [hostedBy, setHostedBy] = useState("");
  const [ticketCampaignSlug, setTicketCampaignSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("events")) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, portalLoading, router, user]);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchErr } = await supabase
          .from("fusion_events")
          .select("*")
          .eq("id", eventId)
          .single();

        if (fetchErr) throw fetchErr;
        if (!data || cancelled) return;

        const ev = data as Record<string, unknown>;
        if (!isFullAdmin && user?.id && ev.created_by !== user.id) {
          router.replace("/dashboard/events?error=access");
          return;
        }

        setTitle(String(ev.title ?? ""));
        setSlug(String(ev.slug ?? ""));
        setDescription(String(ev.description ?? ""));
        setFullDescription(String(ev.full_description ?? ""));
        setEventDate(ev.event_date ? String(ev.event_date).slice(0, 10) : "");
        setEndDate(ev.end_date ? String(ev.end_date).slice(0, 10) : "");
        setLocation(String(ev.location ?? ""));
        setTime(String(ev.time ?? ""));
        setCategory(String(ev.category ?? "Other"));
        setVenue(String(ev.venue ?? ""));
        setHostedBy(String(ev.hosted_by ?? ""));
        setTicketCampaignSlug(String(ev.ticket_campaign_slug ?? ""));
        const img = ev.image_url ? String(ev.image_url) : "";
        setImageUrl(img);
        setImagePreviewUrl(img || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, isFullAdmin, router, user?.id]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Session expired. Please sign in again.");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/campaign-image/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Image upload failed");
    }
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !eventId) return;
    setSaving(true);
    setError(null);

    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");
      if (!eventDate) throw new Error("Event date is required");

      let finalImageUrl: string | null = null;
      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile);
      } else if (imageUrl.trim()) {
        finalImageUrl = imageUrl.trim();
      }

      const { error: updateErr } = await supabase
        .from("fusion_events")
        .update({
          slug: normalizedSlug,
          title: title.trim(),
          description: description.trim() || null,
          full_description: fullDescription.trim() || null,
          event_date: eventDate,
          end_date: endDate.trim() || null,
          location: location.trim() || null,
          time: time.trim() || null,
          category: category.trim() || null,
          venue: venue.trim() || null,
          hosted_by: hostedBy.trim() || null,
          ticket_campaign_slug: ticketCampaignSlug.trim() || null,
          image_url: finalImageUrl,
        })
        .eq("id", eventId);

      if (updateErr) throw updateErr;
      router.push("/dashboard/events");
    } catch (e: any) {
      setError(e?.message ?? "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("events")) return null;

  return (
    <div className="text-left">
      <div className="flex flex-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Edit Event</h2>
          <p className="text-gray-600 mt-1 text-left">Update event details.</p>
        </div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
        >
          Back to events
        </Link>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <form onSubmit={onSubmit} className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event date *</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hosted by</label>
          <input
            value={hostedBy}
            onChange={(e) => setHostedBy(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full description</label>
          <textarea
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Event image (optional)</label>
          {imagePreviewUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-40 object-cover" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImageUrl("");
                  setImagePreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP (max 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImagePreviewUrl(reader.result as string);
                      setImageUrl("");
                    };
                    reader.readAsDataURL(f);
                  }
                }}
              />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket campaign slug (optional)</label>
          <input
            value={ticketCampaignSlug}
            onChange={(e) => setTicketCampaignSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/events" className="px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`btn-primary ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
