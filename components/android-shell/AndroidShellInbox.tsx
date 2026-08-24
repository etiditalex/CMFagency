"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FusionXpressMark from "@/components/android-shell/FusionXpressMark";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import SegmentedTabs from "@/components/fusion-xpress/app-ui/SegmentedTabs";
import SearchField from "@/components/fusion-xpress/app-ui/SearchField";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import { VISITOR_MANAGEMENT_DOCS_PATH } from "@/lib/visitors/industry-options";
import { usePortalCampaigns } from "@/lib/hooks/usePortalCampaigns";
import { useVotingCatalog } from "@/lib/hooks/useVotingCatalog";

type Filter = "all" | "unread" | "archived";

type Thread = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  archived: boolean;
  href: string;
  mark?: boolean;
};

export default function AndroidShellInbox() {
  const { projects: owned } = usePortalCampaigns();
  const { projects: publicVotes } = useVotingCatalog();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const source = owned.length > 0 ? owned : publicVotes;

  const threads = useMemo<Thread[]>(() => {
    const fromApi: Thread[] = source.map((p, i) => ({
      id: p.id,
      name: i === 0 ? "CMF Team" : p.client,
      preview: `${p.status === "completed" ? "Completed" : "Project update"}: ${p.title}`,
      time: p.updatedLabel || "Today",
      unread: p.status === "inProgress" && i < 2 ? 2 - i : 0,
      archived: p.status === "completed",
      href: p.href,
      mark: i === 0,
    }));
    fromApi.push({
      id: "support",
      name: "Support Team",
      preview: "Need help with Fusion Xpress?",
      time: "Archived",
      unread: 0,
      archived: true,
      href: VISITOR_MANAGEMENT_DOCS_PATH,
    });
    return fromApi;
  }, [source]);

  const unreadCount = threads.filter((t) => t.unread > 0 && !t.archived).length;

  const rows = useMemo(() => {
    return threads
      .filter((t) => {
        if (filter === "unread") return t.unread > 0 && !t.archived;
        if (filter === "archived") return t.archived;
        return !t.archived;
      })
      .filter((t) => {
        const s = q.trim().toLowerCase();
        if (!s) return true;
        return t.name.toLowerCase().includes(s) || t.preview.toLowerCase().includes(s);
      });
  }, [threads, filter, q]);

  return (
    <AndroidShellFrame nav unreadCount={unreadCount}>
      <TopBar
        title="Messages"
        right={
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-fx-ink"
            aria-label="Search messages"
          >
            <Search className="h-5 w-5" strokeWidth={1.8} />
          </button>
        }
      />

      <div className="px-5">
        {searchOpen ? (
          <div className="mb-3">
            <SearchField value={q} onChange={setQ} placeholder="Search messages" />
          </div>
        ) : null}
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread", badge: unreadCount || undefined },
            { id: "archived", label: "Archived" },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
        <FxCard padded={false} className="overflow-hidden">
          {rows.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3.5 last:border-b-0"
            >
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-fx-ink">
                {t.mark ? (
                  <span className="flex h-full w-full items-center justify-center">
                    <FusionXpressMark size={36} />
                  </span>
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white">
                    {t.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold text-fx-ink">{t.name}</span>
                  <span className="shrink-0 text-[11px] text-fx-muted">{t.time}</span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-fx-muted">{t.preview}</span>
              </span>
              {t.unread > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {t.unread}
                </span>
              ) : null}
            </Link>
          ))}
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-fx-muted">No messages in this view.</p>
          ) : null}
        </FxCard>
      </div>
    </AndroidShellFrame>
  );
}
