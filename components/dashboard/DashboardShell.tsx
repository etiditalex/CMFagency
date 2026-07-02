"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BadgePercent,
  BookOpen,
  Briefcase,
  Calendar,
  ClipboardCheck,
  FilePenLine,
  FileText,
  Download,
  Inbox,
  LayoutDashboard,
  LayoutPanelLeft,
  Image as ImageIcon,
  Menu,
  MessagesSquare,
  PieChart,
  Plus,
  Search,
  ClipboardList,
  Crown,
  QrCode,
  ScanLine,
  Shield,
  ShoppingBag,
  Ticket,
  UserCheck,
  UserCog,
  UserPlus,
  Vote,
  Users,
  Wallet,
  X,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useOrganizationIndustry } from "@/lib/hooks/useOrganizationIndustry";
import VisitorTrialBanner from "@/components/fusion-xpress/visitor-management/VisitorTrialBanner";
import {
  VISITOR_MANAGEMENT_ACCOUNTS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_NAV_CHILD,
  VISITOR_MANAGEMENT_DOCS_NAV_CHILD,
  VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
  VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
  VISITOR_MANAGEMENT_HR_PAYROLL_API_NAV_CHILD,
  VISITOR_MANAGEMENT_LEAVE_PATH,
  VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  isEmployeesNestedNavPath,
  isLeaveNestedNavPath,
  VISITOR_MANAGEMENT_NAV_CHILDREN,
  VISITOR_MANAGEMENT_PATH,
  VISITOR_MANAGEMENT_SUBSCRIPTION_NAV_CHILD,
  type VisitorManagementNavChild,
  industryLabel,
  visitorManagementHref,
} from "@/lib/visitors/industry-options";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";
import { supabase } from "@/lib/supabase";
import { VISITOR_ONLY_DASHBOARD_PREFIX } from "@/lib/visitors/visitor-only-access";

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
    | "events"
    | "kcm_membership"
    | "teams_work"
    | "visitor_management";
  /** Show if user has any of these features (for All Campaigns). */
  featureKeysAny?: ("ticketing" | "voting")[];
  minTier?: PortalTier; // Fallback for clients if featureKey not used. Admins ignore both.
  /** Expandable links under Visitor Management (industry filters + admin tools). */
  children?: VisitorManagementNavChild[];
};

const TIER_ORDER: Record<PortalTier, number> = { basic: 0, pro: 1, enterprise: 2 };

/** Inactivity timeout in ms. User is logged out after this period without activity. */
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { label: "Transactions", href: "/dashboard/transactions", icon: Download, section: "main", featureKey: "reports" },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText, section: "main" },
  {
    label: "Sales & votes",
    href: "/dashboard/insights",
    icon: PieChart,
    section: "main",
    featureKey: "reports",
  },
  { label: "Gate", href: "/dashboard/gate", icon: ScanLine, section: "main", featureKey: "reports" },
  { label: "FX QR Code Generator", href: "/dashboard/fx-qr-code-generator", icon: QrCode, section: "main" },
  {
    label: "Visitor Management",
    href: VISITOR_MANAGEMENT_PATH,
    icon: UserCheck,
    section: "main",
    featureKey: "visitor_management",
    children: [...VISITOR_MANAGEMENT_NAV_CHILDREN],
  },
  { label: "All Campaigns", href: "/dashboard/campaigns", icon: BarChart3, section: "main", featureKeysAny: ["ticketing", "voting"] },
  { label: "Ticketing", href: "/dashboard/campaigns?type=ticket", icon: Ticket, section: "main", featureKey: "ticketing" },
  { label: "Voting", href: "/dashboard/campaigns?type=vote", icon: Vote, section: "main", featureKey: "voting" },
  { label: "Contestants", href: "/dashboard/contestants", icon: UserPlus, section: "main", featureKey: "voting" },
  { label: "Teams Work", href: "/dashboard/teams-work", icon: ClipboardCheck, section: "main", featureKey: "teams_work" },
  { label: "KCM Membership", href: "/dashboard/kcm-membership", icon: Crown, section: "main", featureKey: "kcm_membership" },
  { label: "Users", href: "/dashboard/users", icon: Users, section: "main", adminOnly: true },
  { label: "Logs", href: "/dashboard/logs", icon: Activity, section: "main", adminOnly: true },
  { label: "Applications", href: "/dashboard/applications", icon: Briefcase, section: "main", adminOnly: true },
  { label: "Job board", href: "/dashboard/job-listings", icon: ClipboardList, section: "main", adminOnly: true },
  { label: "Inquiries", href: "/dashboard/inquiries", icon: Inbox, section: "main", adminOnly: true },
  { label: "Merchandise", href: "/dashboard/merchandise", icon: ShoppingBag, section: "main", adminOnly: true },
  { label: "Gallery", href: "/dashboard/gallery", icon: ImageIcon, section: "main", adminOnly: true },
  { label: "Blogs", href: "/dashboard/blogs", icon: BookOpen, section: "main", adminOnly: true },
  { label: "Blog sidebar ads", href: "/dashboard/blogs/sidebar-ads", icon: LayoutPanelLeft, section: "main", adminOnly: true },
  { label: "Pages", href: "/dashboard/pages", icon: FilePenLine, section: "main", adminOnly: true },
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

function isVisitorSection(pathname: string) {
  return pathname === VISITOR_MANAGEMENT_PATH || pathname.startsWith(`${VISITOR_MANAGEMENT_PATH}/`);
}

function isVisitorIndustryChildActive(
  pathname: string,
  industryParam: string | null,
  industrySlug: string
) {
  if (pathname !== VISITOR_MANAGEMENT_PATH) return false;
  if (industrySlug === "all") return !industryParam || industryParam === "all";
  return industryParam === industrySlug;
}

function isVisitorNavChildActive(
  pathname: string,
  industryParam: string | null,
  child: VisitorManagementNavChild
) {
  if ("href" in child) {
    if (child.href === VISITOR_MANAGEMENT_EMPLOYEES_PATH) {
      return (
        pathname === child.href ||
        (pathname.startsWith(`${child.href}/`) && !isEmployeesNestedNavPath(pathname))
      );
    }
    if (child.href === VISITOR_MANAGEMENT_LEAVE_PATH) {
      return (
        pathname === child.href ||
        (pathname.startsWith(`${child.href}/`) && !isLeaveNestedNavPath(pathname))
      );
    }
    return pathname === child.href || pathname.startsWith(`${child.href}/`);
  }
  return isVisitorIndustryChildActive(pathname, industryParam, child.industrySlug);
}

function visitorNavChildHref(child: VisitorManagementNavChild, ownerId: string | null) {
  if ("href" in child) return pathWithOwner(child.href, ownerId);
  return visitorManagementHref(child.industrySlug);
}

function DashboardNavItem({
  item,
  pathname,
  currentType,
  visitorIndustry,
  visitorNavOpen,
  setVisitorNavOpen,
  showLabels,
  onNavigate,
  pendingApplicationsCount,
  pendingCmfaCount,
  isAdmin,
  adminOwnerId,
}: {
  item: NavItem;
  pathname: string;
  currentType: string | null;
  visitorIndustry: string | null;
  visitorNavOpen: boolean;
  setVisitorNavOpen: (open: boolean) => void;
  showLabels: boolean;
  onNavigate?: () => void;
  pendingApplicationsCount: number;
  pendingCmfaCount: number;
  isAdmin: boolean;
  adminOwnerId: string | null;
}) {
  const Icon = item.icon;

  if (item.children?.length) {
    const parentActive = isVisitorSection(pathname);
    const isOpen = showLabels && (visitorNavOpen || parentActive);

    if (!showLabels) {
      return (
        <Link
          href={item.href}
          prefetch={false}
          onClick={onNavigate}
          className={`group flex items-center justify-center rounded-md px-2 py-2.5 transition-colors ${
            parentActive
              ? "bg-primary-600/20 border border-primary-500/30 text-white"
              : "text-white/80 hover:bg-white/5 hover:text-white"
          }`}
          title={item.label}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${parentActive ? "text-primary-100" : "text-white/60 group-hover:text-white/80"}`}
          />
        </Link>
      );
    }

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setVisitorNavOpen(!visitorNavOpen)}
          className={`group flex w-full items-center rounded-md transition-colors ${
            parentActive
              ? "bg-primary-600/20 border border-primary-500/30 text-white"
              : "text-white/80 hover:bg-white/5 hover:text-white"
          } gap-3 px-3 py-2.5`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${parentActive ? "text-primary-100" : "text-white/60 group-hover:text-white/80"}`}
          />
          <span className="text-sm font-semibold truncate flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen ? (
          <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
            {item.children
              .filter((child) => !("adminOnly" in child && child.adminOnly) || isAdmin)
              .map((child) => {
                const childActive = isVisitorNavChildActive(pathname, visitorIndustry, child);
                const childKey = "href" in child ? child.href : child.industrySlug;
                const nestedUnderEmployees =
                  "href" in child && "underEmployees" in child && child.underEmployees;
                const nestedUnderLeave =
                  "href" in child && "underLeave" in child && child.underLeave;
                const nestedChild = nestedUnderEmployees || nestedUnderLeave;
                return (
                  <Link
                    key={childKey}
                    href={visitorNavChildHref(child, adminOwnerId)}
                    prefetch={false}
                    onClick={onNavigate}
                    className={`block rounded-md py-2 font-medium transition-colors ${
                      nestedChild ? "ml-3 px-3 text-xs" : "px-3 text-sm"
                    } ${
                      childActive
                        ? "bg-primary-600/25 text-white border border-primary-500/20"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {child.label}
                  </Link>
                );
              })}
          </div>
        ) : null}
      </div>
    );
  }

  const active = isActivePath(pathname, currentType, item.href);
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      className={`group flex items-center rounded-md transition-colors ${
        active
          ? "bg-primary-600/20 border border-primary-500/30 text-white"
          : "text-white/80 hover:bg-white/5 hover:text-white"
      } ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"}`}
      title={!showLabels ? item.label : undefined}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary-100" : "text-white/60 group-hover:text-white/80"}`}
      />
      {showLabels && (
        <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.href === "/dashboard/applications" && pendingApplicationsCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-amber-400 text-gray-950 text-[10px] font-extrabold flex-shrink-0">
              {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
            </span>
          )}
          {item.href === "/dashboard/gate" && pendingCmfaCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-amber-400 text-gray-950 text-[10px] font-extrabold flex-shrink-0">
              {pendingCmfaCount > 99 ? "99+" : pendingCmfaCount}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const router = useRouter();
  const currentType = sp?.get("type") ?? null;
  const visitorIndustry = sp?.get("industry") ?? null;
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { isAdmin, isPortalMember, loading: portalLoading, tier, hasFeature, isEmployer, isVisitorOnly } =
    usePortal();
  const adminOwnerId = isAdmin ? sp?.get("owner")?.trim() || null : null;
  const isLeaveManagementPage =
    pathname === VISITOR_MANAGEMENT_LEAVE_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_LEAVE_PATH}/`);
  const isLeaveSettingsPage =
    pathname === VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH}/`);
  const isSummaryReportsPage =
    pathname === VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH}/`);
  const isPerEmployeeReportPage =
    pathname === VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH}/`);
  const isEmployeesPage =
    pathname === VISITOR_MANAGEMENT_EMPLOYEES_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/`);
  const isVisitorManagementPage =
    pathname === VISITOR_MANAGEMENT_PATH ||
    pathname.startsWith(`${VISITOR_MANAGEMENT_PATH}/`);
  const { isRealEstate, loading: industryLoading } = useOrganizationIndustry();

  const navItems = useMemo(() => {
    const showBusinessAccountNav = isVisitorOnly || isAdmin;

    const filterVmChildren = (children: VisitorManagementNavChild[]) =>
      children.filter((child) => {
        if ("adminOnly" in child && child.adminOnly && !isAdmin) return false;
        if ("businessAccountOnly" in child && child.businessAccountOnly && !showBusinessAccountNav) {
          return false;
        }
        if ("realEstateOnly" in child && child.realEstateOnly && !isAdmin && (!isRealEstate || industryLoading)) {
          return false;
        }
        return true;
      });

    return NAV.map((item) => {
      if (item.href !== VISITOR_MANAGEMENT_PATH) return item;
      if (isVisitorOnly) {
        return {
          ...item,
          children: filterVmChildren([
            VISITOR_MANAGEMENT_EMPLOYEES_NAV_CHILD,
            VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
            VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
            VISITOR_MANAGEMENT_HR_PAYROLL_API_NAV_CHILD,
            VISITOR_MANAGEMENT_SUBSCRIPTION_NAV_CHILD,
            VISITOR_MANAGEMENT_DOCS_NAV_CHILD,
          ]),
        };
      }
      const children: VisitorManagementNavChild[] = filterVmChildren([
        ...(isAdmin ? [] : VISITOR_MANAGEMENT_NAV_CHILDREN),
        VISITOR_MANAGEMENT_EMPLOYEES_NAV_CHILD,
        VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
        VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
        VISITOR_MANAGEMENT_HR_PAYROLL_API_NAV_CHILD,
        ...(isAdmin ? [VISITOR_MANAGEMENT_ACCOUNTS_NAV_CHILD] : []),
        VISITOR_MANAGEMENT_DOCS_NAV_CHILD,
      ]);
      return { ...item, children };
    });
  }, [isVisitorOnly, isAdmin, isRealEstate, industryLoading]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(logout);
  const routerRef = useRef(router);
  useEffect(() => {
    logoutRef.current = logout;
    routerRef.current = router;
  }, [logout, router]);

  const redirectAfterLogout = () => {
    router.replace(
      isVisitorOnly ? "/fusion-xpress/smart-visitor-management/sign-in" : "/fusion-xpress/admin-login"
    );
  };

  const handleDashboardLogout = async () => {
    await logout();
    redirectAfterLogout();
  };

  useEffect(() => {
    if (!isAuthenticated || !isPortalMember) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        Promise.resolve(logoutRef.current()).finally(() => {
          routerRef.current.replace(
            isVisitorOnly
              ? "/fusion-xpress/smart-visitor-management/sign-in"
              : "/fusion-xpress/admin-login"
          );
        });
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
  }, [isAuthenticated, isPortalMember, isVisitorOnly]);

  useEffect(() => {
    if (!isVisitorOnly || portalLoading) return;
    if (pathname === "/dashboard") {
      router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
    }
  }, [isVisitorOnly, pathname, portalLoading, router]);

  const canSeeItem = (item: NavItem) => {
    if (isVisitorOnly) {
      if (item.href === "/dashboard/account") return true;
      return item.featureKey === "visitor_management";
    }
    if (isEmployer) {
      if (item.href === "/dashboard/job-listings") return true;
      return item.href === "/dashboard" || item.href === "/dashboard/account";
    }
    if (item.adminOnly && !isAdmin) return false;
    if (item.featureKey) return hasFeature(item.featureKey);
    if (item.featureKeysAny?.length)
      return item.featureKeysAny.some((k) => hasFeature(k));
    if (!item.minTier || isAdmin) return true;
    const userTier = tier ?? "basic";
    return TIER_ORDER[userTier] >= TIER_ORDER[item.minTier];
  };

  const [visitorNavOpen, setVisitorNavOpen] = useState(() => isVisitorSection(pathname));

  useEffect(() => {
    if (isVisitorSection(pathname)) setVisitorNavOpen(true);
  }, [pathname]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("dashboard_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  /** Desktop only: when the rail is collapsed, expand while the pointer is over the sidebar. */
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [pendingCmfaCount, setPendingCmfaCount] = useState(0);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("dashboard_sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const showDesktopSidebarFull = !sidebarCollapsed || sidebarHoverExpanded;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isAuthenticated || !isPortalMember || !hasFeature("reports")) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token || cancelled) return;
          const res = await fetch("/api/cmfa/registrations/pending-count", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && typeof j.total === "number") setPendingCmfaCount(j.total);
          else if (!cancelled) setPendingCmfaCount(0);
        } catch {
          if (!cancelled) setPendingCmfaCount(0);
        }
      })();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, isPortalMember, hasFeature]);

  useEffect(() => {
    if (!isAuthenticated || !isPortalMember || !isAdmin) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token || cancelled) return;
          const res = await fetch("/api/fusion-xpress/applications?status=pending&limit=1", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && typeof j.total === "number") setPendingApplicationsCount(j.total);
          else if (!cancelled) setPendingApplicationsCount(0);
        } catch {
          if (!cancelled) setPendingApplicationsCount(0);
        }
      })();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, isPortalMember, isAdmin]);

  const active = useMemo(() => {
    if (isVisitorSection(pathname)) {
      if (visitorIndustry && visitorIndustry !== "all") {
        return industryLabel(visitorIndustry);
      }
      return "Visitor Management";
    }
    return navItems.find((x) => isActivePath(pathname, currentType, x.href))?.label ?? "Dashboard";
  }, [currentType, pathname, visitorIndustry, navItems]);

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
      {/* Sidebar (desktop): icon rail when collapsed; expands on hover or stays open when pinned */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 text-white border-r border-white/5 overflow-hidden transition-[width] duration-300 ease-out ${
          showDesktopSidebarFull ? "w-72" : "w-[4.25rem]"
        }`}
        onMouseEnter={() => {
          if (sidebarCollapsed) setSidebarHoverExpanded(true);
        }}
        onMouseLeave={() => setSidebarHoverExpanded(false)}
      >
        <div
          className={`relative h-16 flex items-center border-b border-white/5 ${showDesktopSidebarFull ? "gap-3 px-5" : "justify-center px-2"}`}
        >
          <div className="w-9 h-9 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-100" />
          </div>
          {showDesktopSidebarFull && (
            <div className="min-w-0 flex-1 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold tracking-wide leading-tight">Fusion Xpress</div>
                <div className="text-xs text-white/60 leading-tight truncate">CMFAgency admin dashboard</div>
              </div>
              {sidebarCollapsed && sidebarHoverExpanded && (
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                  aria-label="Keep sidebar open"
                  title="Keep open"
                >
                  <PanelLeftOpen className="w-4 h-4 text-white/80" />
                </button>
              )}
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
              aria-label="Collapse sidebar"
              title="Collapse to icons"
            >
              <PanelLeftClose className="w-4 h-4 text-white/80" />
            </button>
          )}
          {sidebarCollapsed && !sidebarHoverExpanded && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="absolute top-4 -right-3 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 border border-primary-400 shadow"
              aria-label="Pin sidebar open"
              title="Keep sidebar open"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${showDesktopSidebarFull ? "px-3" : "px-2"}`}>
          {sections.map((s) => (
            <div key={s.key}>
              {showDesktopSidebarFull && (
                <div className="px-3 text-xs font-extrabold tracking-widest text-white/45 uppercase">{s.label}</div>
              )}
              <div className="mt-2 space-y-1">
                {navItems.filter((x) => x.section === s.key && canSeeItem(x)).map((item) => (
                  <DashboardNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    currentType={currentType}
                    visitorIndustry={visitorIndustry}
                    visitorNavOpen={visitorNavOpen}
                    setVisitorNavOpen={setVisitorNavOpen}
                    showLabels={showDesktopSidebarFull}
                    pendingApplicationsCount={pendingApplicationsCount}
                    pendingCmfaCount={pendingCmfaCount}
                    isAdmin={isAdmin}
                    adminOwnerId={adminOwnerId}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`mt-auto border-t border-white/5 ${showDesktopSidebarFull ? "p-4" : "p-2"}`}>
          <div className={`flex items-center ${showDesktopSidebarFull ? "justify-between gap-3" : "justify-center"}`}>
            {showDesktopSidebarFull && (
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{user?.name || user?.email || "Admin"}</div>
                <div className="text-xs text-white/55 truncate">{user?.email || "Signed in"}</div>
              </div>
            )}
            <button
              type="button"
              onClick={handleDashboardLogout}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer: tap hamburger; backdrop + slide-in (touch has no hover) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[min(20rem,85vw)] max-w-[85vw] flex flex-col bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 text-white border-r border-white/10 shadow-xl">
            <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary-100" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold tracking-wide leading-tight">Fusion Xpress</div>
                  <div className="text-xs sm:text-sm text-white/60 leading-tight truncate">CMFAgency admin dashboard</div>
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

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {sections.map((s) => (
                <div key={s.key}>
                  <div className="px-3 text-xs sm:text-sm font-extrabold tracking-widest text-white/45 uppercase">{s.label}</div>
                  <div className="mt-2 space-y-1">
                    {navItems.filter((x) => x.section === s.key && canSeeItem(x)).map((item) => (
                      <DashboardNavItem
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        currentType={currentType}
                        visitorIndustry={visitorIndustry}
                        visitorNavOpen={visitorNavOpen}
                        setVisitorNavOpen={setVisitorNavOpen}
                        showLabels
                        onNavigate={() => setMobileOpen(false)}
                        pendingApplicationsCount={pendingApplicationsCount}
                        pendingCmfaCount={pendingCmfaCount}
                        isAdmin={isAdmin}
                        adminOwnerId={adminOwnerId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void handleDashboardLogout();
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
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent outline-none text-base sm:text-sm text-gray-900 placeholder:text-gray-500 min-w-0"
            />
          </div>

          <div className="ml-auto hidden sm:flex items-center gap-2 text-white min-w-0">
            <div className="text-sm font-semibold truncate max-w-[220px]">{user?.name || user?.email || "Admin"}</div>
          </div>
        </header>

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

        <main className="flex-1 px-4 sm:px-6 pb-10 pt-6">
          <div
            className={
              isLeaveManagementPage ||
              isLeaveSettingsPage ||
              isSummaryReportsPage ||
              isPerEmployeeReportPage ||
              isEmployeesPage ||
              isVisitorManagementPage
                ? "max-w-none"
                : "mx-auto max-w-4xl lg:max-w-5xl"
            }
          >
            <div
              className={
                isLeaveManagementPage ||
              isLeaveSettingsPage ||
              isSummaryReportsPage ||
              isPerEmployeeReportPage ||
              isEmployeesPage ||
              isVisitorManagementPage
                  ? "p-0"
                  : "rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:p-6 md:p-8"
              }
            >
              {isVisitorOnly && !isAdmin ? <VisitorTrialBanner /> : null}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

