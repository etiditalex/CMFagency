"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, UserPlus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

function isMissingPortalMembersTable(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

type Campaign = {
  id: string;
  slug: string;
  title: string;
};

type Contestant = {
  id: string;
  campaign_id: string;
  name: string;
  email: string | null;
  image_url: string | null;
  created_at: string;
  voting_link_sent_at: string | null;
};

type CategoryWithCount = Campaign & { contestant_count: number; contestants: Contestant[] };

export default function DashboardContestantsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [totalContestants, setTotalContestants] = useState(0);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("voting")) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let campaignsQuery = supabase
          .from("campaigns")
          .select("id,slug,title")
          .eq("type", "vote")
          .order("title");

        if (!isFullAdmin && user?.id) {
          campaignsQuery = campaignsQuery.eq("created_by", user.id);
        }

        const { data: campaignRows, error: campErr } = await campaignsQuery;
        if (campErr) throw campErr;

        const campaigns = (campaignRows ?? []) as Campaign[];
        if (campaigns.length === 0) {
          if (!cancelled) {
            setCategories([]);
            setTotalContestants(0);
          }
          setLoading(false);
          return;
        }

        const campaignIds = campaigns.map((c) => c.id);
        const { data: contestantRows, error: conErr } = await supabase
          .from("contestants")
          .select("id,campaign_id,name,email,image_url,created_at,voting_link_sent_at")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false });

        if (conErr) throw conErr;

        const contestants = (contestantRows ?? []) as Contestant[];
        const byCampaign = new Map<string, Contestant[]>();
        for (const c of contestants) {
          const list = byCampaign.get(c.campaign_id) ?? [];
          list.push(c);
          byCampaign.set(c.campaign_id, list);
        }

        const withCounts: CategoryWithCount[] = campaigns.map((c) => {
          const list = byCampaign.get(c.id) ?? [];
          return {
            ...c,
            contestant_count: list.length,
            contestants: list,
          };
        });

        const total = contestants.length;

        if (!cancelled) {
          setCategories(withCounts);
          setTotalContestants(total);
        }
      } catch (e) {
        if (isMissingPortalMembersTable(e)) {
          await supabase.auth.signOut();
          router.replace("/fusion-xpress?error=setup");
          return;
        }
        if (!cancelled) setError((e as Error)?.message ?? "Failed to load contestants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, isFullAdmin, router, user?.id]);

  const downloadCsv = (category: CategoryWithCount) => {
    const headers = ["Name", "Email", "Registered", "Voting link sent"];
    const rows = category.contestants.map((c) => [
      c.name.replace(/"/g, '""'),
      (c.email ?? "").replace(/"/g, '""'),
      new Date(c.created_at).toLocaleString(),
      c.voting_link_sent_at ? new Date(c.voting_link_sent_at).toLocaleString() : "—",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contestants-${category.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("voting")) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Contestants</h2>
          <p className="text-gray-600 mt-1">
            View and download model registrations by voting category. Contestants are visible to voters on each campaign&apos;s voting page.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 px-4 py-2">
            <UserPlus className="w-5 h-5 text-primary-700" />
            <span className="font-bold text-primary-900">Total registrations</span>
            <span className="text-2xl font-extrabold text-primary-700">{totalContestants}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-gray-600">
            <p className="font-semibold">No voting categories yet</p>
            <p className="mt-1 text-sm">
              Create a voting campaign from{" "}
              <Link href="/dashboard/campaigns/new" className="text-primary-600 hover:underline font-medium">
                New Campaign
              </Link>{" "}
              to start receiving contestant registrations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-6 py-3 font-bold text-gray-600">Category</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Slug</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Contestants</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-200">
                    <td className="px-6 py-4 font-semibold text-gray-900">{cat.title}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono">{cat.slug}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{cat.contestant_count}</td>
                    <td className="px-6 py-4 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/campaigns/${cat.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => downloadCsv(cat)}
                        disabled={cat.contestant_count === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Download
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
