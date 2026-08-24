"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { normalizeSlug } from "@/lib/ensure-campaign-from-event";
import {
  campaignToProgress,
  campaignToStatus,
  formatProjectDate,
  type FusionProject,
} from "@/lib/fusion-xpress-app";
import { androidShellHref } from "@/lib/android-shell";
import { supabase } from "@/lib/supabase";

const CAMPAIGNS_SELECT =
  "id,type,slug,title,currency,unit_amount,is_active,created_at,created_by,starts_at,ends_at,image_url";

type CampaignRow = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
};

type CampaignStatsRow = {
  campaign_id: string;
  total_amount: number;
  total_votes: number;
  successful_transactions: number;
};

const FALLBACK_IMG = {
  ticket:
    "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
  vote: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778990421/banner_2_la4bzj.jpg",
};

function toProject(
  row: CampaignRow,
  stats: CampaignStatsRow | undefined
): FusionProject {
  const status = campaignToStatus({ isActive: row.is_active, endsAt: row.ends_at });
  const progress = campaignToProgress({
    status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    successfulTransactions: stats?.successful_transactions,
  });
  const image = row.image_url && !row.image_url.startsWith("data:") ? row.image_url : FALLBACK_IMG[row.type];
  return {
    id: row.id,
    title: row.title,
    client: row.type === "vote" ? "Voting campaign" : "Ticket campaign",
    href: androidShellHref(`/${row.slug}`),
    imageUrl: image,
    status,
    progress,
    updatedLabel: formatProjectDate(row.ends_at || row.created_at),
  };
}

export function usePortalCampaigns() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isFullAdmin } = usePortal();
  const [projects, setProjects] = useState<FusionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let campaignRows: CampaignRow[] = [];
      let statsOwnedRes: { data: unknown; error: unknown } | null = null;

      if (isFullAdmin) {
        const campRes = await supabase
          .from("campaigns")
          .select(CAMPAIGNS_SELECT)
          .order("created_at", { ascending: false });
        if (campRes.error) throw campRes.error;
        campaignRows = (campRes.data ?? []) as CampaignRow[];
      } else {
        const [ownedRes, eventsRes] = await Promise.all([
          supabase
            .from("campaigns")
            .select(CAMPAIGNS_SELECT)
            .eq("created_by", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("fusion_events")
            .select("ticket_campaign_slug,ticket_tiers")
            .eq("created_by", user.id),
        ]);
        if (ownedRes.error) throw ownedRes.error;
        const byId = new Map<string, CampaignRow>(
          (ownedRes.data ?? []).map((c) => [c.id, c as CampaignRow])
        );
        const eventSlugs = new Set<string>();
        for (const ev of eventsRes.data ?? []) {
          const row = ev as {
            ticket_campaign_slug?: string | null;
            ticket_tiers?: Array<{ slug?: string }> | null;
          };
          const s = normalizeSlug(String(row.ticket_campaign_slug ?? ""));
          if (s) eventSlugs.add(s);
          for (const t of Array.isArray(row.ticket_tiers) ? row.ticket_tiers : []) {
            const ts = normalizeSlug(String(t?.slug ?? ""));
            if (ts) eventSlugs.add(ts);
          }
        }
        const ownedOnlyIds = Array.from(byId.keys());
        if (eventSlugs.size > 0) {
          const [eventCampaignsRes, statsParallelRes] = await Promise.all([
            supabase.from("campaigns").select(CAMPAIGNS_SELECT).in("slug", Array.from(eventSlugs)),
            ownedOnlyIds.length > 0
              ? supabase
                  .from("campaign_stats")
                  .select("campaign_id,total_amount,total_votes,successful_transactions")
                  .in("campaign_id", ownedOnlyIds)
              : Promise.resolve({ data: [], error: null }),
          ]);
          statsOwnedRes = statsParallelRes;
          if (!eventCampaignsRes.error && eventCampaignsRes.data?.length) {
            for (const c of eventCampaignsRes.data as CampaignRow[]) {
              if (!byId.has(c.id)) byId.set(c.id, c);
            }
          }
        }
        campaignRows = Array.from(byId.values());
      }

      campaignRows = campaignRows.filter((c) => String(c.slug ?? "").toLowerCase() !== "merchandise");
      const ids = campaignRows.map((c) => c.id);
      let statsRows: CampaignStatsRow[] = [];
      if (ids.length > 0) {
        if (statsOwnedRes && !statsOwnedRes.error) {
          statsRows = (statsOwnedRes.data ?? []) as CampaignStatsRow[];
        }
        const have = new Set(statsRows.map((s) => s.campaign_id));
        const missing = ids.filter((id) => !have.has(id));
        if (missing.length > 0) {
          const extra = await supabase
            .from("campaign_stats")
            .select("campaign_id,total_amount,total_votes,successful_transactions")
            .in("campaign_id", missing);
          if (!extra.error) statsRows = [...statsRows, ...((extra.data ?? []) as CampaignStatsRow[])];
        }
      }
      const statsById = new Map(statsRows.map((s) => [s.campaign_id, s]));
      setProjects(campaignRows.map((c) => toProject(c, statsById.get(c.id))));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when portal session changes
  }, [authLoading, portalLoading, isAuthenticated, user?.id, isPortalMember, isFullAdmin]);

  return { projects, loading, error, refresh: load };
}
