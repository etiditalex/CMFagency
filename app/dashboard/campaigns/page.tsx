"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, LineChart, Plus, Ticket, Vote } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

function isMissingAdminUsersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("admin_users") && msg.includes("does not exist"));
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

type CampaignTypeFilter = "all" | "ticket" | "vote";

export default function DashboardCampaignsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Admin gate: dashboard requires allowlisted admin account.
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminErr) {
          // Missing allowlist table means setup isn't complete; block access.
          if (isMissingAdminUsersTable(adminErr)) {
            await supabase.auth.signOut();
            router.replace("/fusion-xpress?error=setup");
            return;
          }
          throw adminErr;
        }

        if (!adminRow) {
          // Sign out so we don't "share" sessions with the job applicant login.
          await supabase.auth.signOut();
          router.replace("/fusion-xpress?error=unauthorized");
          return;
        }

        const { data: campaignRows, error: campaignsError } = await supabase
          .from("campaigns")
          .select("id,type,slug,title,currency,unit_amount,is_active,created_at")
          .order("created_at", { ascending: false });

        if (campaignsError) throw campaignsError;

        // Stats view is optional; if it's missing, still show campaigns + links.
        // NOTE: do not filter by created_by so admins can see existing campaigns created earlier.
        const { data: statsRows, error: statsError } = await supabase
          .from("campaign_stats")
          .select("campaign_id,total_amount,total_votes,successful_transactions");

        const statsById = new Map<string, CampaignStatsRow>(
          (!statsError ? (statsRows ?? []) : []).map((s) => [s.campaign_id, s])
        );

        const merged: CampaignWithStats[] = (campaignRows ?? []).map((c: CampaignRow) => {
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
        if (!cancelled) setError(e?.message ?? "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router, user]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const copyLink = async (slug: string) => {
    const url = `${origin}/pay/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // noop (clipboard may be blocked on some browsers)
    }
  };

  // IMPORTANT: hooks must run on every render (no conditional hook calls).
  const filter = (() => {
    const t = (sp?.get("type") ?? "all").toLowerCase();
    if (t === "ticket" || t === "vote") return t;
    return "all";
  })() as CampaignTypeFilter;

  const counts = useMemo(() => {
    const ticket = campaigns.filter((c) => c.type === "ticket").length;
    const vote = campaigns.filter((c) => c.type === "vote").length;
    return { all: campaigns.length, ticket, vote };
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (filter === "all") return campaigns;
    return campaigns.filter((c) => c.type === filter);
  }, [campaigns, filter]);

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
  if (!isAuthenticated || !user) return null;

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

      {/* Type filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: `All (${counts.all})` },
          { id: "ticket", label: `Ticketing (${counts.ticket})` },
          { id: "vote", label: `Voting (${counts.vote})` },
        ].map((t) => {
          const active = filter === (t.id as CampaignTypeFilter);
          const href = t.id === "all" ? "/dashboard/campaigns" : `/dashboard/campaigns?type=${t.id}`;
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
              {t.id === "ticket" ? <Ticket className="w-4 h-4" /> : t.id === "vote" ? <Vote className="w-4 h-4" /> : null}
              {t.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm p-8 border border-gray-200">
            <p className="text-gray-700 text-left">
              {filter === "vote"
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
              const publicUrl = `/pay/${c.slug}`;

              return (
                <div key={c.id} className="bg-white rounded-md shadow-sm p-6 border border-gray-200 border-t-4 border-primary-600">
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
                          <div className={`text-lg font-bold ${c.is_active ? "text-green-700" : "text-gray-500"}`}>
                            {c.is_active ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
                        title="Open campaign report"
                      >
                        <LineChart className="w-4 h-4" />
                        Report
                      </Link>
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
    </div>
  );
}

