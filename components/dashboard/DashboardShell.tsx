"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  BarChart3,
  BadgePercent,
  Calendar,
  Download,
  Inbox,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Plus,
  Search,
  Shield,
  Ticket,
  UserCog,
  Vote,
  Users,
  Wallet,
  X,
  LogOut,
  User,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

type PortalTier = "basic" | "pro" | "enterprise";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  section: "main" | "manage" | "settings";
  adminOnly?: boolean;
  /** Feature key: client needs this feature enabled to see item. Prefer over minTier. */
  featureKey?:
    | "payouts"
    | "coupons"
    | "managers"
    | "email"
    | "create_campaign"
    | "ticketing"
    | "voting"
    | "reports"
    | "events";
  /** Show if user has any of these features (for All Campaigns). */
  featureKeysAny?: ("ticketing" | "voting")[];
  minTier?: PortalTier; // Fallback for clients if featureKey not used. Admins ignore both.
};

const TIER_ORDER: Record<PortalTier, number> = { basic: 0, pro: 1, enterprise: 2 };

/** Inactivity timeout in ms. User is logged out after this period without activity. */
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { label: "Transactions", href: "/dashboard/transactions", icon: Download, section: "main", featureKey: "reports" },
  { label: "All Campaigns", href: "/dashboard/campaigns", icon: BarChart3, section: "main", featureKeysAny: ["ticketing", "voting"] },
  { label: "Ticketing", href: "/dashboard/campaigns?type=ticket", icon: Ticket, section: "main", featureKey: "ticketing" },
  { label: "Voting", href: "/dashboard/campaigns?type=vote", icon: Vote, section: "main", featureKey: "voting" },
  { label: "Users", href: "/dashboard/users", icon: Users, section: "main", adminOnly: true },
  { label: "Inquiries", href: "/dashboard/inquiries", icon: Inbox, section: "main", adminOnly: true },
  { label: "Changer", href: "/dashboard/changer", icon: MessagesSquare, section: "main", adminOnly: true },
  { label: "Events", href: "/dashboard/events", icon: Calendar, section: "main", featureKey: "events" },
  { label: "New Campaign", href: "/dashboard/campaigns/new", icon: Plus, section: "manage", featureKey: "create_campaign" },
  { label: "Payouts", href: "/dashboard/payouts", icon: Wallet, section: "manage", featureKey: "payouts" },
  { label: "Coupons", href: "/dashboard/coupons", icon: BadgePercent, section: "manage", featureKey: "coupons" },
  { label: "Managers", href: "/dashboard/managers", icon: UserCog, section: "manage", featureKey: "managers" },
  { label: "Email", href: "/dashboard/email", icon: MessagesSquare, section: "manage", featureKey: "email" },
  { label: "Account", href: "/dashboard/account", icon: User, section: "settings" },
];

function parseHref(href: string) {
  const [path, query] = href.split("?");
  return { path, query: new URLSearchParams(query ?? "") };
}

function isActivePath(pathname: string, currentType: string | null, href: string) {
  const { path, query } = parseHref(href);
  if (path === "/dashboard") return pathname === "/dashboard";

  const matchesPath = pathname === path || pathname.startsWith(`${path}/`);
  if (!matchesPath) return false;

  const expectedType = query.get("type");
  if (!expectedType) return true;
  return String(currentType ?? "").toLowerCase() === expectedType.toLowerCase();
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const router = useRouter();
  const currentType = sp?.get("type") ?? null;
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { isAdmin, isPortalMember, loading: portalLoading, tier, hasFeature } = usePortal();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(logout);
  const routerRef = useRef(router);
  useEffect(() => {
    logoutRef.current = logout;
    routerRef.current = router;
  }, [logout, router]);

  useEffect(() => {
    if (!isAuthenticated || !isPortalMember) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        logoutRef.current();
        routerRef.current.replace("/fusion-xpress");
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      resetTimer();
    };

    let lastMove = 0;
    const throttledMove = () => {
      const now = Date.now();
      if (now - lastMove < 1000) return;
      lastMove = now;
      handleActivity();
    };

    resetTimer();

    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("mousemove", throttledMove);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("mousemove", throttledMove);
    };
  }, [isAuthenticated, isPortalMember]);

  const canSeeItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.featureKey) return hasFeature(item.featureKey);
    if (item.featureKeysAny?.length)
      return item.featureKeysAny.some((k) => hasFeature(k));
    if (!item.minTier || isAdmin) return true;
    const userTier = tier ?? "basic";
    return TIER_ORDER[userTier] >= TIER_ORDER[item.minTier];
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const active = useMemo(() => {
    return NAV.find((x) => isActivePath(pathname, currentType, x.href))?.label ?? "Dashboard";
  }, [currentType, pathname]);

  const breadcrumbTail = active === "Dashboard" ? "Read" : active;

  // Avoid flashing private shell while auth pages redirect.
  if (authLoading || portalLoading || !isAuthenticated || !isPortalMember) {
    return <>{children}</>;
  }

  const sections: Array<{ key: NavItem["section"]; label: string }> = [
    { key: "main", label: "Main Navigation" },
    { key: "manage", label: "Manage Menu" },
    { key: "settings", label: "Application Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-72 flex-col bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 text-white border-r border-white/5">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-100" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold tracking-wide leading-tight">Fusion Xpress</div>
            <div className="text-xs text-white/60 leading-tight truncate">CMFAgency admin dashboard</div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-5">
          {sections.map((s) => (
            <div key={s.key}>
              <div className="px-3 text-xs font-extrabold tracking-widest text-white/45 uppercase">
                {s.label}
              </div>
              <div className="mt-2 space-y-1">
                {NAV.filter((x) => x.section === s.key && canSeeItem(x)).map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, currentType, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        active
                          ? "bg-primary-600/20 border border-primary-500/30 text-white"
                          : "text-white/80 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-primary-100" : "text-white/60 group-hover:text-white/80"}`} />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{user?.name || user?.email || "Admin"}</div>
              <div className="text-xs text-white/55 truncate">{user?.email || "Signed in"}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 text-white border-r border-white/10">
            <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-100" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold tracking-wide leading-tight">Fusion Xpress</div>
                  <div className="text-sm text-white/60 leading-tight truncate">CMFAgency admin dashboard</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-3 py-4 space-y-5">
              {sections.map((s) => (
                <div key={s.key}>
                  <div className="px-3 text-xs sm:text-sm font-extrabold tracking-widest text-white/45 uppercase">
                    {s.label}
                  </div>
                  <div className="mt-2 space-y-1">
                    {NAV.filter((x) => x.section === s.key && canSeeItem(x)).map((item) => {
                      const Icon = item.icon;
                      const active = isActivePath(pathname, currentType, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                            active
                              ? "bg-primary-600/20 border border-primary-500/30 text-white"
                              : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? "text-primary-100" : "text-white/60 group-hover:text-white/80"}`} />
                          <span className="text-sm font-semibold">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-auto p-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (matches screenshot vibe) */}
        <header className="h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-black/5 bg-gradient-to-r from-primary-800 via-primary-600 to-secondary-700">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/15 hover:bg-white/20 border border-white/20"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2 bg-white/95 rounded-md border border-primary-600/25 w-full max-w-xl h-10 px-3 shadow-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent outline-none text-base sm:text-sm text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="ml-auto hidden sm:flex items-center gap-2 text-white">
            <div className="text-sm font-semibold truncate max-w-[220px]">
              {user?.name || user?.email || "Admin"}
            </div>
          </div>
        </header>

        {/* Page header */}
        <div className="px-4 sm:px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-left">{active}</h1>
              <div className="mt-1 text-sm text-gray-600 text-left">
                <span className="text-primary-700 font-semibold">Dashboard</span>
                <span className="mx-2">/</span>
                <span className="text-gray-700">{breadcrumbTail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content - app-like contained layout like application screens */}
        <main className="flex-1 px-4 sm:px-6 pb-10 pt-6">
          <div className="max-w-4xl lg:max-w-5xl mx-auto">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

