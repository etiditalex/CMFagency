"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Minus, Plus, Ticket, Vote } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type CampaignType = "ticket" | "vote";

type ContestantDraft = {
  name: string;
  image_url: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ContestantRow = {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
};

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const campaignId = useMemo(() => {
    const p = params?.id;
    if (Array.isArray(p)) return p[0] ?? "";
    return String(p ?? "");
  }, [params?.id]);

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, features, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<CampaignType>("ticket");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [unitAmount, setUnitAmount] = useState<number>(1000);
  const [maxPerTxn, setMaxPerTxn] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);

  const [contestants, setContestants] = useState<ContestantDraft[]>([
    { name: "", image_url: "" },
    { name: "", image_url: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("create_campaign")) router.replace("/dashboard/campaigns");
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, portalLoading, router, user]);

  useEffect(() => {
    if (portalLoading) return;
    const hasT = features.includes("ticketing");
    const hasV = features.includes("voting");
    if (!hasT && hasV) setType("vote");
    if (hasT && !hasV) setType("ticket");
  }, [portalLoading, features]);

  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: campaign, error: cErr } = await supabase
          .from("campaigns")
          .select("id,type,slug,title,description,image_url,currency,unit_amount,max_per_txn,is_active,created_by")
          .eq("id", campaignId)
          .single();

        if (cErr) throw cErr;
        if (!campaign || cancelled) return;

        // Clients can only edit their own campaigns.
        if (!isFullAdmin && user?.id && (campaign as { created_by?: string }).created_by !== user.id) {
          router.replace("/dashboard/campaigns?error=access");
          return;
        }

        setType((campaign.type as CampaignType) ?? "ticket");
        setTitle(campaign.title ?? "");
        setSlug(campaign.slug ?? "");
        setDescription(campaign.description ?? "");
        setImageUrl((campaign as { image_url?: string | null }).image_url ?? "");
        setCurrency(campaign.currency ?? "KES");
        setUnitAmount(Number(campaign.unit_amount) ?? 1000);
        setMaxPerTxn(Number(campaign.max_per_txn) ?? 10);
        setIsActive(Boolean(campaign.is_active));

        if (campaign.type === "vote") {
          const { data: conRows, error: conErr } = await supabase
            .from("contestants")
            .select("id,name,image_url,sort_order")
            .eq("campaign_id", campaignId)
            .order("sort_order", { ascending: true });

          if (!conErr && conRows && conRows.length > 0) {
            const mapped = (conRows as ContestantRow[]).map((c) => ({
              name: c.name ?? "",
              image_url: c.image_url ?? "",
            }));
            setContestants(mapped.length >= 2 ? mapped : [...mapped, { name: "", image_url: "" }]);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!slugify(slug).trim()) return false;
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) return false;
    if (!Number.isFinite(maxPerTxn) || maxPerTxn <= 0) return false;
    const effectiveType = hasFeature("ticketing") && hasFeature("voting") ? type : hasFeature("ticketing") ? "ticket" : "vote";
    if (effectiveType === "vote") {
      return contestants.some((c) => c.name.trim().length > 0);
    }
    return true;
  }, [contestants, hasFeature, maxPerTxn, slug, title, type, unitAmount]);

  const addContestant = () => {
    setContestants((prev) => [...prev, { name: "", image_url: "" }]);
  };

  const removeContestant = (idx: number) => {
    setContestants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateContestant = (idx: number, patch: Partial<ContestantDraft>) => {
    setContestants((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaignId) return;

    setSaving(true);
    setError(null);

    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");

      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({
          type,
          title: title.trim(),
          slug: normalizedSlug,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          currency: currency.trim().toUpperCase(),
          unit_amount: Math.trunc(unitAmount),
          max_per_txn: Math.trunc(maxPerTxn),
          is_active: isActive,
        })
        .eq("id", campaignId);

      if (updateErr) throw updateErr;

      if (type === "vote") {
        const { error: delErr } = await supabase.from("contestants").delete().eq("campaign_id", campaignId);
        if (delErr) throw delErr;

        const cleaned = contestants
          .map((c, i) => ({
            campaign_id: campaignId,
            name: c.name.trim(),
            image_url: c.image_url.trim() || null,
            sort_order: i,
          }))
          .filter((c) => c.name.length > 0);

        if (cleaned.length === 0) {
          throw new Error("Add at least 1 contestant for a voting campaign.");
        }

        const { error: contestantsErr } = await supabase.from("contestants").insert(cleaned);
        if (contestantsErr) throw contestantsErr;
      } else {
        const { error: delErr } = await supabase.from("contestants").delete().eq("campaign_id", campaignId);
        if (delErr) throw delErr;
      }

      router.push("/dashboard/campaigns");
    } catch (e: any) {
      setError(e?.message ?? "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("create_campaign")) return null;

  const canCreateTicket = hasFeature("ticketing");
  const canCreateVote = hasFeature("voting");

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Edit Campaign</h2>
          <p className="text-gray-600 mt-1 text-left">
            Update campaign settings. Public link: <span className="font-mono">/[slug]</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold">
            Back to campaigns
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <form onSubmit={onSubmit} className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign type</label>
            <div className="grid grid-cols-2 gap-3">
              {canCreateTicket && (
                <button
                  type="button"
                  onClick={() => setType("ticket")}
                  className={`px-4 py-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                    type === "ticket" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 bg-white"
                  }`}
                >
                  <Ticket className="w-5 h-5" />
                  Tickets
                </button>
              )}
              {canCreateVote && (
                <button
                  type="button"
                  onClick={() => setType("vote")}
                  className={`px-4 py-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                    type === "vote" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 bg-white"
                  }`}
                >
                  <Vote className="w-5 h-5" />
                  Voting
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex items-center gap-3">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600"
                />
                <label htmlFor="is-active" className="text-gray-700 font-semibold">
                  Active (publicly visible)
                </label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. CFMA 2026 VIP Tickets"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              placeholder="cfma-2026-vip"
              required
            />
            <p className="text-xs text-gray-500 mt-2">Used to generate the public link: /{slugify(slug) || "your-slug"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              placeholder="KES"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Shown on the public payment page."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Campaign image (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-500 mt-2">Paste an image URL for a banner or thumbnail on the public page.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit amount</label>
            <input
              type="number"
              min={1}
              value={unitAmount}
              onChange={(e) => setUnitAmount(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max per transaction</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxPerTxn}
              onChange={(e) => setMaxPerTxn(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {type === "vote" && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Contestants</h2>
                <p className="text-gray-600">Add contestants users can vote for.</p>
              </div>
              <button type="button" onClick={addContestant} className="btn-outline inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="space-y-4">
              {contestants.map((c, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-semibold text-gray-900">Contestant {idx + 1}</div>
                    {contestants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContestant(idx)}
                        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold"
                      >
                        <Minus className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        value={c.name}
                        onChange={(e) => updateContestant(idx, { name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g. Contestant A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (optional)</label>
                      <input
                        value={c.image_url}
                        onChange={(e) => updateContestant(idx, { image_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className={`btn-primary ${(!canSubmit || saving) && "opacity-60 cursor-not-allowed"}`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
