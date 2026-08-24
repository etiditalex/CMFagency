"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import ProgressBar from "@/components/fusion-xpress/app-ui/ProgressBar";
import SegmentedTabs from "@/components/fusion-xpress/app-ui/SegmentedTabs";
import StatusBadge from "@/components/fusion-xpress/app-ui/StatusBadge";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import { VISITOR_SIGN_IN_PATH, androidShellHref } from "@/lib/android-shell";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { usePortalCampaigns } from "@/lib/hooks/usePortalCampaigns";
import { useVotingCatalog } from "@/lib/hooks/useVotingCatalog";
import type { ProjectStatus } from "@/lib/fusion-xpress-app";

type Filter = "all" | ProjectStatus;

export default function AndroidShellActivity() {
  const { isAuthenticated } = useAuth();
  const { isPortalMember, hasFeature } = usePortal();
  const { projects: owned, loading, refresh } = usePortalCampaigns();
  const { projects: publicVotes } = useVotingCatalog();
  const [filter, setFilter] = useState<Filter>("all");

  const source = owned.length > 0 ? owned : publicVotes;
  const rows = useMemo(() => {
    if (filter === "all") return source;
    return source.filter((p) => p.status === filter);
  }, [source, filter]);

  const addHref =
    isAuthenticated && isPortalMember && hasFeature("create_campaign")
      ? androidShellHref("/dashboard/campaigns/new")
      : androidShellHref(isAuthenticated ? "/dashboard/campaigns" : VISITOR_SIGN_IN_PATH);

  return (
    <AndroidShellFrame nav>
      <TopBar
        title="Projects"
        right={
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-fx-ink"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
          </button>
        }
      />

      <div className="px-5">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: "All" },
            { id: "inProgress", label: "In Progress" },
            { id: "completed", label: "Completed" },
          ]}
        />
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href}>
                <FxCard padded={false} className="p-3">
                  <div className="flex gap-3">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-fx-accentSoft">
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold text-fx-ink">{row.title}</span>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-fx-inactive" />
                      </span>
                      <span className="mt-0.5 block text-[13px] text-fx-muted">{row.client}</span>
                      <div className="mt-2">
                        <StatusBadge status={row.status} />
                      </div>
                      <ProgressBar value={row.progress} className="mt-3" />
                    </span>
                  </div>
                </FxCard>
              </Link>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="mt-10 text-center text-[13px] text-fx-muted">
            {loading ? "Loading campaigns…" : "No projects in this view."}
          </p>
        ) : null}
      </div>

      <Link
        href={addHref}
        className="absolute bottom-[4.85rem] right-5 flex h-14 w-14 items-center justify-center rounded-full bg-fx-accent text-white shadow-[0_8px_20px_rgba(123,47,247,0.35)]"
        aria-label="Add project"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </AndroidShellFrame>
  );
}
