"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  // Must match DB constraint: ^[a-z0-9]+(?:-[a-z0-9]+)*$
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, features } = usePortal();

  const [type, setType] = useState<CampaignType>("ticket");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
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
    if (!hasFeature("create_campaign")) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, portalLoading, router, user]);

  useEffect(() => {
    if (portalLoading) return;
    const hasT = features.includes("ticketing");
    const hasV = features.includes("voting");
    if (!hasT && hasV) setType("vote");
    if (hasT && !hasV) setType("ticket");
  }, [portalLoading, features]);

  useEffect(() => {
    // Auto-suggest slug if user hasn't typed one yet.
    if (!slug) setSlug(slugify(title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

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
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");

      // NOTE: We store amounts as integers to match provider APIs that use minor units.
      // If your provider expects a different scaling for your currency, adjust here and in the webhook.
      const { data: campaign, error: insertErr } = await supabase
        .from("campaigns")
        .insert({
          type,
          title: title.trim(),
          slug: normalizedSlug,
          description: description.trim() || null,
          currency: currency.trim().toUpperCase(),
          unit_amount: Math.trunc(unitAmount),
          max_per_txn: Math.trunc(maxPerTxn),
          is_active: isActive,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      if (type === "vote") {
        const cleaned = contestants
          .map((c, i) => ({
            campaign_id: campaign.id,
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
      }

      router.push("/dashboard/campaigns");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading) {
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
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">New Campaign</h2>
          <p className="text-gray-600 mt-1 text-left">
            Creates a shareable link at <span className="font-mono">/[slug]</span>. Public users don’t need login.
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
              <p className="text-xs text-gray-500 mt-2">
                Voting MVP counts <span className="font-semibold">one contestant per transaction</span>.
              </p>
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
              <p className="text-xs text-gray-500 mt-2">
                Stored as integer. Assumed to match your payment provider’s expected unit (often “minor units”).
              </p>
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
              {saving ? "Creating..." : "Create campaign"}
            </button>
          </div>
        </form>
    </div>
  );
}

