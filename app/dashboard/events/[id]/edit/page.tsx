"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { type FusionTicketTier, normalizeTierFromDb, tierToStoredJson } from "@/lib/fusion-event-ticket-tier";

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
  const [paymentLink, setPaymentLink] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentLabel, setDocumentLabel] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [ticketPriceKes, setTicketPriceKes] = useState<string>("");
  const [freeRegistration, setFreeRegistration] = useState(false);
  const [registrations, setRegistrations] = useState<
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      notes: string | null;
      additional_guests?: number | null;
      created_at: string;
      checked_in_at: string | null;
      reference: string;
    }>
  >([]);
  const [regStats, setRegStats] = useState<{ count: number; totalHeadcount: number } | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [useTieredTickets, setUseTieredTickets] = useState(false);
  const [ticketTiers, setTicketTiers] = useState<FusionTicketTier[]>([]);
  const [imageFocus, setImageFocus] = useState<string>("center center");
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
        setPaymentLink(String(ev.payment_link ?? ""));
        setDocumentUrl(String(ev.document_url ?? ""));
        setDocumentLabel(String(ev.document_label ?? ""));
        setMapUrl(String(ev.map_url ?? ""));
        setTicketPriceKes(
          ev.ticket_price_kes != null && ev.ticket_price_kes !== ""
            ? String(ev.ticket_price_kes)
            : ""
        );
        setFreeRegistration(Boolean((ev as { free_registration?: boolean }).free_registration));
        const rawTiers = (ev as { ticket_tiers?: unknown[] | null }).ticket_tiers;
        const tiers =
          Array.isArray(rawTiers) && rawTiers.length > 0
            ? rawTiers.map((t) => normalizeTierFromDb(t as Partial<FusionTicketTier>))
            : [];
        setUseTieredTickets(tiers.length > 0);
        setTicketTiers(
          tiers.length > 0 ? tiers : [{ id: "regular", label: "Regular", slug: "", unit_amount_kes: 0, inclusions: [], people_per_package: 1 }]
        );
        setImageFocus(String((ev as { image_focus?: string | null }).image_focus ?? "center center"));
        const img = ev.image_url ? String(ev.image_url) : "";
        setImageUrl(img);
        setImagePreviewUrl(img || null);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, isFullAdmin, router, user?.id]);

  useEffect(() => {
    if (!eventId || !freeRegistration || loading || authLoading || portalLoading) {
      if (!freeRegistration) {
        setRegistrations([]);
        setRegStats(null);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setRegLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) setRegLoading(false);
        return;
      }
      const res = await fetch(`/api/events/free-registrations?event_id=${encodeURIComponent(eventId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        registrations?: typeof registrations;
        count?: number;
        totalHeadcount?: number;
      };
      if (!cancelled) {
        if (res.ok) {
          setRegistrations(json.registrations ?? []);
          setRegStats({
            count: json.count ?? 0,
            totalHeadcount: json.totalHeadcount ?? 0,
          });
        } else {
          setRegistrations([]);
          setRegStats(null);
        }
        setRegLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, freeRegistration, loading, authLoading, portalLoading]);

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
          payment_link: paymentLink.trim() || null,
          document_url: documentUrl.trim() || null,
          document_label: documentLabel.trim() || null,
          map_url: mapUrl.trim() || null,
          ticket_price_kes: ticketPriceKes.trim() ? Number(ticketPriceKes.trim()) : null,
          free_registration: freeRegistration,
          free_registration_ask_party_size: freeRegistration,
          ticket_tiers: useTieredTickets && ticketTiers.length > 0 ? ticketTiers.map((t) => tierToStoredJson(t)) : null,
          image_focus: imageFocus.trim() || null,
          image_url: finalImageUrl,
        })
        .eq("id", eventId);

      if (updateErr) throw updateErr;
      router.push("/dashboard/events");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update event");
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Image position (how it is cropped)</label>
          <select
            value={imageFocus}
            onChange={(e) => setImageFocus(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="center center">Center center (default)</option>
            <option value="top center">Center top</option>
            <option value="bottom center">Center bottom</option>
            <option value="center left">Center left</option>
            <option value="center right">Center right</option>
          </select>
        </div>

        <div className="flex items-start gap-2">
          <input
            id="free-reg-edit"
            type="checkbox"
            checked={freeRegistration}
            onChange={(e) => setFreeRegistration(e.target.checked)}
            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="free-reg-edit" className="text-sm font-medium text-gray-700">
            Free registration only (no ticket sale). Visitors register and receive an email invitation with QR code for gate entry.
          </label>
        </div>

        {freeRegistration && (
          <div className="ml-7 space-y-3 rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-xs text-gray-600">
              Registrants enter how many people attend with them (for headcount). Totals below include those guests.
            </p>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Free registrations</h3>
              {regLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : regStats && regStats.count > 0 ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">{regStats.count}</span> registration{regStats.count === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold">{regStats.totalHeadcount}</span> expected people total (including guests)
                  </p>
                  <div className="max-h-64 overflow-auto rounded border border-gray-200 bg-white text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                          <th className="p-2 font-medium">Name</th>
                          <th className="p-2 font-medium">Email</th>
                          <th className="p-2 font-medium">+Guests</th>
                          <th className="p-2 font-medium">Party</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((r) => {
                          const g = Math.max(0, Number(r.additional_guests) || 0);
                          return (
                            <tr key={r.id} className="border-t border-gray-100">
                              <td className="p-2">{r.name ?? "—"}</td>
                              <td className="p-2 break-all">{r.email ?? "—"}</td>
                              <td className="p-2">{g}</td>
                              <td className="p-2 font-medium">{1 + g}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No registrations yet. Share the public event link so guests can register.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <input
            id="tiered-tickets-edit"
            type="checkbox"
            checked={useTieredTickets}
            onChange={(e) => {
              setUseTieredTickets(e.target.checked);
              if (e.target.checked && ticketTiers.length === 0)
                setTicketTiers([{ id: "regular", label: "Regular", slug: "", unit_amount_kes: 0, inclusions: [], people_per_package: 1 }]);
            }}
            disabled={freeRegistration}
            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="tiered-tickets-edit" className="text-sm font-medium text-gray-700">
            Tiered tickets (e.g. Regular, VIP, VVIP). Opens a ticket banner/modal on the upcoming events page with multiple categories.
          </label>
        </div>

        {useTieredTickets && !freeRegistration && (
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Ticket tiers</label>
              <button
                type="button"
                onClick={() =>
                  setTicketTiers((t) => [
                    ...t,
                    { id: `tier-${t.length}`, label: "", slug: "", unit_amount_kes: 0, inclusions: [], people_per_package: 1 },
                  ])
                }
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add tier
              </button>
            </div>
            {ticketTiers.map((tier, i) => (
              <div key={tier.id} className="space-y-2 rounded border border-gray-100 p-3 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Label (e.g. Regular, VIP)</label>
                    <input
                      value={tier.label}
                      onChange={(e) =>
                        setTicketTiers((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. Early bird - Regular"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Campaign slug</label>
                    <input
                      value={tier.slug}
                      onChange={(e) =>
                        setTicketTiers((prev) => prev.map((p, j) => (j === i ? { ...p, slug: e.target.value.trim() } : p)))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      placeholder="e.g. cfma-2026"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Price (KES)</label>
                    <input
                      type="number"
                      min="0"
                      value={tier.unit_amount_kes || ""}
                      onChange={(e) =>
                        setTicketTiers((prev) =>
                          prev.map((p, j) => (j === i ? { ...p, unit_amount_kes: Number(e.target.value) || 0 } : p))
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">People / package</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={tier.people_per_package ?? 1}
                      onChange={(e) =>
                        setTicketTiers((prev) =>
                          prev.map((p, j) =>
                            j === i ? { ...p, people_per_package: Math.max(1, Math.min(500, Number(e.target.value) || 1)) } : p
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      title="Guests covered by one purchase (e.g. 4 for a VVIP round table)"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setTicketTiers((prev) => prev.filter((_, j) => j !== i))}
                      disabled={ticketTiers.length <= 1}
                      className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inclusions / perks (one per line, optional)</label>
                  <textarea
                    value={Array.isArray(tier.inclusions) ? tier.inclusions.join("\n") : ""}
                    onChange={(e) =>
                      setTicketTiers((prev) =>
                        prev.map((p, j) =>
                          j === i
                            ? {
                                ...p,
                                inclusions: e.target.value
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }
                            : p
                        )
                      )
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g. Cocktail and Water (one per line)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Shown on the ticket modal to help sell (e.g. VIP: cocktail and water; VVIP: spirits + soda + water).</p>
                </div>
                <p className="text-xs text-gray-500">
                  <strong>People / package</strong>: guests one payment covers (default 1). E.g. <strong>4</strong> for a VVIP round table package.
                </p>
              </div>
            ))}
            <p className="text-xs text-gray-500">Each tier must have a Fusion Xpress ticket campaign with the same slug.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticket campaign slug (optional)</label>
            <input
              value={ticketCampaignSlug}
              onChange={(e) => setTicketCampaignSlug(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              disabled={freeRegistration || useTieredTickets}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment link (optional)</label>
            <input
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
              disabled={freeRegistration}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket / entrance price (KES, optional)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={ticketPriceKes}
            onChange={(e) => setTicketPriceKes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. 12000"
          />
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
            placeholder="https://maps.google.com/..."
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
