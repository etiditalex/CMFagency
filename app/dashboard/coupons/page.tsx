"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgePercent, Loader2, Plus, Ticket, ToggleLeft, ToggleRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  campaign_id: string | null;
  created_by: string;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignOption = { id: string; slug: string; title: string };

export default function DashboardCouponsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percent" | "fixed">("percent");
  const [formValue, setFormValue] = useState("");
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formName, setFormName] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch("/api/coupons", { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { coupons?: CouponRow[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load coupons");
    setCoupons(json.coupons ?? []);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const { data: rows } = await supabase
      .from("campaigns")
      .select("id,slug,title")
      .eq("type", "ticket")
      .order("title");
    setCampaigns((rows ?? []) as CampaignOption[]);
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("coupons")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  useEffect(() => {
    if (!isPortalMember || !user?.id || !hasFeature("coupons")) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await Promise.all([fetchCoupons(), fetchCampaigns()]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isPortalMember, user?.id, hasFeature, fetchCoupons, fetchCampaigns]);

  const handleToggleActive = async (id: string, current: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    setTogglingId(id);
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !current }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      await fetchCoupons();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const code = formCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) {
      setFormError("Code is required");
      return;
    }
    const val = Math.trunc(Number(formValue));
    if (!Number.isFinite(val) || val <= 0) {
      setFormError("Discount value must be a positive number");
      return;
    }
    if (formType === "percent" && val > 100) {
      setFormError("Percent cannot exceed 100");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code,
          discount_type: formType,
          discount_value: val,
          campaign_id: formCampaignId.trim() || null,
          name: formName.trim() || null,
          max_uses: formMaxUses.trim() ? Math.max(0, Math.trunc(Number(formMaxUses))) : null,
          valid_from: formValidFrom.trim() || null,
          valid_until: formValidUntil.trim() || null,
          is_active: true,
        }),
      });
      const json = (await res.json()) as { coupon?: CouponRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setShowForm(false);
      setFormCode("");
      setFormValue("");
      setFormCampaignId("");
      setFormName("");
      setFormMaxUses("");
      setFormValidFrom("");
      setFormValidUntil("");
      await fetchCoupons();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("coupons")) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Coupons</h2>
          <p className="mt-1 text-gray-600 text-left max-w-3xl">
            Create offer codes for ticketing campaigns. Buyers enter the code at checkout to get a discount.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns?type=ticket"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
          >
            <Ticket className="w-4 h-4" />
            Ticketing campaigns
          </Link>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            <Plus className="w-4 h-4" />
            New offer
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-primary-600" />
            Create offer code
          </h3>
          <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
            {formError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. EARLYBIRD20"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                maxLength={32}
              />
              <p className="mt-1 text-xs text-gray-500">Buyers will enter this at checkout (case-insensitive).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "percent" | "fixed")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed amount (per ticket)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formType === "percent" ? "Percent (1–100) *" : "Amount (e.g. KES) *"}
                </label>
                <input
                  type="number"
                  min={formType === "percent" ? 1 : 1}
                  max={formType === "percent" ? 100 : undefined}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign (optional)</label>
              <select
                value={formCampaignId}
                onChange={(e) => setFormCampaignId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="">Any campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.slug})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Leave empty for the code to work on all your ticket campaigns.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Early bird 20% off"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max uses (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid from (optional)</label>
                <input
                  type="datetime-local"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid until (optional)</label>
                <input
                  type="datetime-local"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-2"
              >
                {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create offer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <BadgePercent className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-900">Your offer codes</span>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No coupons yet. Create one above to run an offer — buyers will use the code at checkout.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Scope</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Usage</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{c.code}</span>
                      {c.name && (
                        <span className="block text-xs text-gray-500">{c.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {c.discount_type === "percent"
                        ? `${c.discount_value}% off`
                        : `KES ${c.discount_value} off per ticket`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.campaign_id ? "One campaign" : "All campaigns"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.used_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          c.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.id, c.is_active)}
                        disabled={togglingId === c.id}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        {togglingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : c.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
