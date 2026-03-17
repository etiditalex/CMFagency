"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, FileEdit, LineChart, Pencil, Plus, Search, Trash2, Ticket, UserPlus, Vote, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { supabase } from "@/lib/supabase";

function isMissingPortalMembersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

type CampaignRow = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  currency: string;
  unit_amount: number;
  is_active: boolean;
  created_at: string;
  created_by?: string;
};

type CampaignStatsRow = {
  campaign_id: string;
  total_amount: number;
  total_votes: number;
  successful_transactions: number;
};

type CampaignWithStats = CampaignRow & {
  total_amount: number;
  total_votes: number;
  successful_transactions: number;
};

type CampaignTypeFilter = "all" | "ticket" | "vote" | "drafts";

export default function DashboardCampaignsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignCampaign, setAssignCampaign] = useState<CampaignWithStats | null>(null);
  const [assignTargetUserId, setAssignTargetUserId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ user_id: string; email: string; role: string }>>([]);
  const [usersListLoading, setUsersListLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let campaignsQuery = supabase
          .from("campaigns")
          .select("id,type,slug,title,currency,unit_amount,is_active,created_at,created_by")
          .order("created_at", { ascending: false });

        // Admins see all campaigns. Clients see only: (1) campaigns they created, (2) campaigns for events they own.
        let campaignRows: CampaignRow[] | null = null;
        if (isFullAdmin) {
          const { data, error: campaignsError } = await campaignsQuery;
          if (campaignsError) throw campaignsError;
          campaignRows = data;
        } else if (user?.id) {
          const [ownedRes, eventsRes] = await Promise.all([
            supabase
              .from("campaigns")
              .select("id,type,slug,title,currency,unit_amount,is_active,created_at,created_by")
              .eq("created_by", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("fusion_events")
              .select("ticket_campaign_slug,ticket_tiers")
              .eq("created_by", user.id),
          ]);
          if (ownedRes.error) throw ownedRes.error;
          const byId = new Map<string, CampaignRow>((ownedRes.data ?? []).map((c) => [c.id, c as CampaignRow]));
          const eventSlugs = new Set<string>();
          for (const ev of eventsRes.data ?? []) {
            const row = ev as { ticket_campaign_slug?: string | null; ticket_tiers?: Array<{ slug?: string }> | null };
            const s = normalizeSlug(String(row.ticket_campaign_slug ?? ""));
            if (s) eventSlugs.add(s);
            const tiers = Array.isArray(row.ticket_tiers) ? row.ticket_tiers : [];
            for (const t of tiers) {
              const ts = normalizeSlug(String(t?.slug ?? ""));
              if (ts) eventSlugs.add(ts);
            }
          }
          if (eventSlugs.size > 0) {
            const { data: eventCampaigns, error: eventErr } = await supabase
              .from("campaigns")
              .select("id,type,slug,title,currency,unit_amount,is_active,created_at,created_by")
              .in("slug", Array.from(eventSlugs))
              .order("created_at", { ascending: false });
            if (!eventErr && eventCampaigns?.length) {
              for (const c of eventCampaigns as CampaignRow[]) {
                if (!byId.has(c.id)) byId.set(c.id, c);
              }
            }
          }
          campaignRows = Array.from(byId.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        } else {
          campaignRows = [];
        }

        if (campaignRows === null) campaignRows = [];

        // Stats view is optional; if it's missing, still show campaigns + links.
        const { data: statsRows, error: statsError } = await supabase
          .from("campaign_stats")
          .select("campaign_id,total_amount,total_votes,successful_transactions");

        const statsById = new Map<string, CampaignStatsRow>(
          (!statsError ? (statsRows ?? []) : []).map((s) => [s.campaign_id, s])
        );

        const merged: CampaignWithStats[] = (campaignRows ?? [])
          .filter((c: CampaignRow) => String(c.slug ?? "").toLowerCase() !== "merchandise")
          .map((c: CampaignRow) => {
            const s = statsById.get(c.id);
            return {
              ...c,
              total_amount: s?.total_amount ?? 0,
              total_votes: s?.total_votes ?? 0,
              successful_transactions: s?.successful_transactions ?? 0,
            };
          });

        if (!cancelled) setCampaigns(merged);
      } catch (e: any) {
        // If portal membership table isn't installed, block access until configured.
        if (isMissingPortalMembersTable(e)) {
          await supabase.auth.signOut();
          router.replace("/fusion-xpress?error=setup");
          return;
        }
        if (!cancelled) setError(e?.message ?? "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, portalLoading, router, user, isFullAdmin, refreshKey]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  // When opening assign modal, fetch portal users (admin only).
  useEffect(() => {
    if (!assignCampaign || !isFullAdmin) return;
    let cancelled = false;
    const load = async () => {
      setUsersListLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/fusion-xpress/users", { headers: { Authorization: `Bearer ${token}` } });
        const json = (await res.json()) as { users?: Array<{ user_id: string; email: string; role: string }>; error?: string };
        if (!cancelled && res.ok && json.users) setUsersList(json.users);
      } catch {
        if (!cancelled) setUsersList([]);
      } finally {
        if (!cancelled) setUsersListLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [assignCampaign, isFullAdmin]);

  const handleAssignToClient = async () => {
    if (!assignCampaign || !assignTargetUserId) return;
    setAssignLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/fusion-xpress/campaigns/${assignCampaign.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ user_id: assignTargetUserId }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Assign failed");
      setAssignCampaign(null);
      setAssignTargetUserId("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message ?? "Failed to assign campaign");
    } finally {
      setAssignLoading(false);
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // noop (clipboard may be blocked on some browsers)
    }
  };

  // IMPORTANT: hooks must run on every render (no conditional hook calls).
  const filter = (() => {
    const t = (sp?.get("type") ?? "all").toLowerCase();
    if (t === "ticket" || t === "vote" || t === "drafts") return t;
    return "all";
  })() as CampaignTypeFilter;

  const counts = useMemo(() => {
    const ticket = campaigns.filter((c) => c.type === "ticket").length;
    const vote = campaigns.filter((c) => c.type === "vote").length;
    const drafts = campaigns.filter((c) => !c.is_active).length;
    return { all: campaigns.length, ticket, vote, drafts };
  }, [campaigns]);

  const filtered = useMemo(() => {
    let list = campaigns;
    if (filter === "drafts") list = list.filter((c) => !c.is_active);
    else if (filter !== "all") list = list.filter((c) => c.type === filter);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [campaigns, filter, searchQuery]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (campaignId: string, title: string) => {
    if (!confirm(`Delete campaign "${title}"? All related transactions will be removed. This cannot be undone.`)) return;
    setDeletingId(campaignId);
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  // If redirecting, render nothing to avoid flashing private UI
  if (!isAuthenticated || !user || !isPortalMember) return null;

  return (
    <div className="text-left">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Campaigns</h2>
          <p className="text-gray-600 mt-1 max-w-3xl text-left">
            Create ticket or voting campaigns and share public payment links. Payment confirmation and fulfillment are
            handled by webhook only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5">
        <label htmlFor="campaign-search" className="sr-only">
          Search campaigns
        </label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
          <input
            id="campaign-search"
            type="search"
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Search campaigns by title or slug"
          />
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <span className="text-sm font-semibold">×</span>
            </button>
          )}
        </div>
      </div>

      {/* Type filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: `All (${counts.all})`, icon: null },
          { id: "drafts", label: `Drafts (${counts.drafts})`, icon: FileEdit },
          { id: "ticket", label: `Ticketing (${counts.ticket})`, icon: Ticket },
          { id: "vote", label: `Voting (${counts.vote})`, icon: Vote },
        ].map((t) => {
          const active = filter === (t.id as CampaignTypeFilter);
          const href = t.id === "all" ? "/dashboard/campaigns" : `/dashboard/campaigns?type=${t.id}`;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-semibold transition-colors ${
                active
                  ? "border-primary-600 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {t.label}
            </Link>
          );
        })}
      </div>

      {(error || sp?.get("error") === "access") && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {sp?.get("error") === "access"
            ? "You don't have access to that campaign. You can only view and edit campaigns you created."
            : error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm p-8 border border-gray-200">
            <p className="text-gray-700 text-left">
              {searchQuery.trim()
                ? `No campaigns match "${searchQuery.trim()}". Try a different search or clear the search.`
                : filter === "drafts"
                ? "You don't have any draft campaigns. Unpublished (inactive) campaigns appear here."
                : filter === "vote"
                ? "You don’t have any voting campaigns yet. Create one to start collecting votes."
                : filter === "ticket"
                  ? "You don’t have any ticketing campaigns yet. Create one to start selling tickets."
                  : "You don’t have any campaigns yet. Create your first one to generate a shareable link."}
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </Link>
            </div>
          </div>
        ) : (
          filtered.map((c) => {
              const isVote = c.type === "vote";
              const Icon = isVote ? Vote : Ticket;
              const publicUrl = `/${c.slug}`;

              return (
                <div key={c.id} className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex w-9 h-9 rounded-lg bg-primary-50 items-center justify-center">
                          <Icon className="w-5 h-5 text-primary-700" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-gray-900 text-lg truncate text-left">{c.title}</div>
                          <div className="text-sm text-gray-600 truncate text-left">
                            <span className="font-semibold">{isVote ? "Voting" : "Tickets"}</span> ·{" "}
                            <span className="font-mono">{c.slug}</span>
                          </div>
                          {isFullAdmin && (c as CampaignRow).created_by && (
                            <div className="mt-1 text-xs text-gray-500">
                              Created by: {(c as CampaignRow).created_by === user?.id ? "You" : "Client"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <div className="text-xs text-gray-500">{isVote ? "Total votes" : "Total sales"}</div>
                          <div className="text-lg font-bold text-gray-900">
                            {isVote ? c.total_votes.toLocaleString() : `${c.currency} ${c.total_amount.toLocaleString()}`}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <div className="text-xs text-gray-500">Successful txns</div>
                          <div className="text-lg font-bold text-gray-900">{c.successful_transactions.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <div className="text-xs text-gray-500">Status</div>
                          <div className={`text-lg font-bold ${c.is_active ? "text-green-700" : "text-amber-600"}`}>
                            {c.is_active ? "Active" : "Draft"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {isFullAdmin && (
                        <button
                          type="button"
                          onClick={() => { setAssignCampaign(c); setAssignTargetUserId(""); }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-primary-200 hover:bg-primary-50 text-primary-700 font-semibold"
                          title="Assign this campaign to a client so it appears in their dashboard"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assign to client
                        </button>
                      )}
                      {hasFeature("create_campaign") && (
                        <Link
                          href={`/dashboard/campaigns/${c.id}/edit`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
                          title="Edit campaign"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Link>
                      )}
                      {hasFeature("reports") && (
                        <Link
                          href={`/dashboard/campaigns/${c.id}`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
                          title="Open campaign report"
                        >
                          <LineChart className="w-4 h-4" />
                          Report
                        </Link>
                      )}
                      <Link
                        href={publicUrl}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
                        title="Open public link"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyLink(c.slug)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
                        title="Copy public link"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      {hasFeature("create_campaign") && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.title)}
                          disabled={deletingId === c.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-200 hover:bg-red-50 text-red-700 font-semibold disabled:opacity-50"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === c.id ? "Deleting…" : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-600 break-all">
                    Public link:{" "}
                    <span className="font-mono">{origin ? `${origin}${publicUrl}` : publicUrl}</span>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Assign campaign to client modal (admin only) */}
      {assignCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-gray-900">Assign campaign to client</h3>
              <button
                type="button"
                onClick={() => { setAssignCampaign(null); setAssignTargetUserId(""); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              <strong>{assignCampaign.title}</strong> will appear in the selected client&apos;s dashboard with the same sales and transaction stats. The client may need to refresh their dashboard to see it.
            </p>
            {usersListLoading ? (
              <p className="text-gray-500 text-sm">Loading users…</p>
            ) : (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select user (client)</label>
                <select
                  value={assignTargetUserId}
                  onChange={(e) => setAssignTargetUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                >
                  <option value="">— Select —</option>
                  {usersList.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.email} {u.role !== "client" ? `(${u.role})` : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssignCampaign(null); setAssignTargetUserId(""); }}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignToClient}
                    disabled={assignLoading || !assignTargetUserId}
                    className="px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {assignLoading ? "Assigning…" : "Assign"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

