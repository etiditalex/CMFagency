"use client";

import { useEffect, useState } from "react";

import {
  campaignToProgress,
  campaignToStatus,
  formatProjectDate,
  type FusionProject,
} from "@/lib/fusion-xpress-app";
import { androidShellHref } from "@/lib/android-shell";

type Category = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
};

export function useVotingCatalog() {
  const [projects, setProjects] = useState<FusionProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/voting/all-categories");
        const json = (await res.json()) as {
          categories?: Category[];
          voting_starts_at?: string | null;
          voting_ends_at?: string | null;
        };
        if (!res.ok || cancelled) return;
        const status = campaignToStatus({
          isActive: true,
          endsAt: json.voting_ends_at,
        });
        const list = (json.categories ?? []).slice(0, 12).map((c) => ({
          id: c.id,
          title: c.title,
          client: "Voting campaign",
          href: androidShellHref(`/${c.slug}`),
          imageUrl: c.image_url,
          status,
          progress: campaignToProgress({
            status,
            startsAt: json.voting_starts_at,
            endsAt: json.voting_ends_at,
          }),
          updatedLabel: formatProjectDate(json.voting_ends_at),
        }));
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading };
}
