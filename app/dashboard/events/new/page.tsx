"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Upload, X } from "lucide-react";

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

export default function NewEventPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

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
  const [paymentLink, setPaymentLink] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentLabel, setDocumentLabel] = useState("");
  const [mapUrl, setMapUrl] = useState("");
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
    if (!slug) setSlug(slugify(title));
  }, [title]);

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
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");
      if (!eventDate) throw new Error("Event date is required");

      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImageFile(imageFile);

      const { error: insertErr } = await supabase.from("fusion_events").insert({
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
        payment_link: paymentLink.trim() || null,
        document_url: documentUrl.trim() || null,
        document_label: documentLabel.trim() || null,
        map_url: mapUrl.trim() || null,
        image_url: imageUrl,
        created_by: user.id,
      });

      if (insertErr) throw insertErr;
      router.push("/dashboard/events");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading) {
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
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">New Event</h2>
          <p className="text-gray-600 mt-1 text-left">
            Add an event to appear on the upcoming or past events pages.
          </p>
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
            placeholder="e.g. Coast Fashion and Modelling Awards 2026"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            placeholder="coast-fashion-modelling-awards-2026"
            required
          />
          <p className="text-xs text-gray-500 mt-2">URL: /events/upcoming/{slugify(slug) || "slug"} or /events/past/{slugify(slug) || "slug"}</p>
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
              placeholder="e.g. Mombasa, Kenya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. 6:00 PM - 11:00 PM"
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
              placeholder="e.g. St. Paul's University"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hosted by</label>
          <input
            value={hostedBy}
            onChange={(e) => setHostedBy(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. Global Women Impact Foundation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Short description shown on event cards"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full description</label>
          <textarea
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Longer description for event detail page"
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
                    reader.onload = () => setImagePreviewUrl(reader.result as string);
                    reader.readAsDataURL(f);
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticket campaign slug (optional)</label>
            <input
              value={ticketCampaignSlug}
              onChange={(e) => setTicketCampaignSlug(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              placeholder="e.g. cfma-2026"
            />
            <p className="text-xs text-gray-500 mt-2">Link to Fusion Xpress ticket campaign</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment link (optional)</label>
            <input
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-2">External pay link (M-Pesa, PayPal, etc.)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document URL (optional)</label>
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://.../proposal.pdf"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document button label (optional)</label>
            <input
              value={documentLabel}
              onChange={(e) => setDocumentLabel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Download Proposal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Map location (optional)</label>
          <input
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://maps.google.com/... or https://goo.gl/maps/..."
          />
          <p className="text-xs text-gray-500 mt-2">Google Maps link for event venue</p>
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
            {saving ? "Creating…" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}
