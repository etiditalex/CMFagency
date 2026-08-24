"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Monitor, Palette, Ticket, Users, Vote, type LucideIcon } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import SearchField from "@/components/fusion-xpress/app-ui/SearchField";
import StatusBadge from "@/components/fusion-xpress/app-ui/StatusBadge";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import {
  ANDROID_SHELL_ACTIVITY_PATH,
  ANDROID_SHELL_MODULES,
  androidShellHref,
} from "@/lib/android-shell";
import { VISITOR_MANAGEMENT_PATH } from "@/lib/visitors/industry-options";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCampaigns } from "@/lib/hooks/usePortalCampaigns";
import { useVotingCatalog } from "@/lib/hooks/useVotingCatalog";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  visitor: ClipboardList,
  employees: Users,
  tickets: Ticket,
  votes: Vote,
  design: Monitor,
  brand: Palette,
};

const SERVICE_LABELS: Record<string, string> = {
  visitor: "Visitor Management",
  employees: "Employees",
  tickets: "Ticketing",
  votes: "Voting",
};

export default function AndroidShellHome() {
  const { user, isAuthenticated } = useAuth();
  const { projects: owned } = usePortalCampaigns();
  const { projects: publicVotes } = useVotingCatalog();
  const [query, setQuery] = useState("");
  const firstName = (user?.name || "there").split(" ")[0];

  const catalog = useMemo(
    () =>
      ANDROID_SHELL_MODULES.map((mod) =>
        mod.id === "visitor" && isAuthenticated ? { ...mod, href: VISITOR_MANAGEMENT_PATH } : mod
      ),
    [isAuthenticated]
  );

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((m) => {
      const label = SERVICE_LABELS[m.id] ?? m.title;
      return label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    });
  }, [query, catalog]);

  const recent = useMemo(() => {
    const source = owned.length > 0 ? owned : publicVotes;
    const q = query.trim().toLowerCase();
    const list = q ? source.filter((p) => p.title.toLowerCase().includes(q)) : source;
    return list.slice(0, 4);
  }, [owned, publicVotes, query]);

  const unreadCount = recent.filter((p) => p.status === "inProgress").length;

  return (
    <AndroidShellFrame nav unreadCount={unreadCount}>
      <TopBar title={`Hello, ${firstName} 👋`} subtitle="Welcome back!" unreadCount={unreadCount} />

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <SearchField value={query} onChange={setQuery} />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-fx-ink">Our Services</h2>
          <Link href={ANDROID_SHELL_ACTIVITY_PATH} className="text-[13px] font-semibold text-fx-accent">
            View all
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {services.map((mod, index) => {
            const Icon = SERVICE_ICONS[mod.id] ?? Monitor;
            return (
              <Link key={mod.id} href={androidShellHref(mod.href)}>
                <FxCard className={index === 0 ? "bg-fx-accentSoft/60" : ""}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fx-accentSoft text-fx-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-3 block text-[14px] font-semibold leading-snug text-fx-ink">
                    {SERVICE_LABELS[mod.id] ?? mod.title}
                  </span>
                </FxCard>
              </Link>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-fx-ink">Recent Projects</h2>
          <Link href={ANDROID_SHELL_ACTIVITY_PATH} className="text-[13px] font-semibold text-fx-accent">
            View all
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {recent.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>
                <FxCard padded={false} className="flex items-center gap-3 p-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-fx-accentSoft">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-fx-ink">{item.title}</span>
                    <span className="mt-0.5 block text-[13px] text-fx-muted">
                      {item.status === "completed" ? "Completed" : "In Progress"}
                      {item.updatedLabel ? ` • ${item.updatedLabel}` : ""}
                    </span>
                  </span>
                  <StatusBadge status={item.status} />
                </FxCard>
              </Link>
            </li>
          ))}
        </ul>
        {recent.length === 0 ? (
          <p className="mt-6 text-center text-[13px] text-fx-muted">No live campaigns yet.</p>
        ) : null}
      </div>
    </AndroidShellFrame>
  );
}
