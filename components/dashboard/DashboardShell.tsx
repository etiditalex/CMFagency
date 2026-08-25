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
  EyeOff,
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
  Receipt,
  ScanLine,
  ShoppingBag,
  Star,
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
  Bell,
} from "lucide-react";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useOrganizationIndustry } from "@/lib/hooks/useOrganizationIndustry";
import VisitorTrialBanner from "@/components/fusion-xpress/visitor-management/VisitorTrialBanner";
import {
  VISITOR_MANAGEMENT_ACCOUNTS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
  VISITOR_MANAGEMENT_EMPLOYEES_NAV_CHILD,
  VISITOR_MANAGEMENT_DOCS_NAV_CHILD,
  VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
  VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
  VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD,
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

type NestedNavLink = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

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
  /** Simple expandable links under a parent item (e.g. Contestants). */
  nestedLinks?: NestedNavLink[];
};

const TIER_ORDER: Record<PortalTier, number> = { basic: 0, pro: 1, enterprise: 2 };

/** Inactivity timeout in ms. User is logged out after this period without activity. */
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

const NAV_ACTIVE =
  "relative bg-[#eaf1fb] text-primary-800 before:absolute before:inset-y-[6px] before:left-0 before:w-[3px] before:rounded-full before:bg-primary-700";
const NAV_IDLE = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
const NAV_CHILD_ACTIVE = "bg-[#eaf1fb] text-primary-800";
const NAV_CHILD_IDLE = "text-slate-500 hover:bg-slate-50 hover:text-slate-800";
const NAV_ICON_ACTIVE = "text-primary-700";
const NAV_ICON_IDLE = "text-slate-400 group-hover:text-slate-600";

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { label: "Transactions", href: "/dashboard/transactions", icon: Download, section: "main", featureKey: "reports" },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText, section: "main" },
  { label: "Receipts", href: "/dashboard/receipts", icon: Receipt, section: "main" },
  {
    label: "Smart Management Invoice",
    href: "/dashboard/smart-management-invoice",
    icon: FileText,
    section: "main",
  },
  { label: "Quotation", href: "/dashboard/quotations", icon: FilePenLine, section: "main" },
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
  { label: "Vote visibility", href: "/dashboard/voting/settings", icon: EyeOff, section: "main", featureKey: "voting" },
  {
    label: "Contestants",
    href: "/dashboard/contestants",
    icon: UserPlus,
    section: "main",
    featureKey: "voting",
    nestedLinks: [
      { label: "All contestants", href: "/dashboard/contestants" },
      { label: "Download results", href: "/dashboard/contestants/results", adminOnly: true },
    ],
  },
  { label: "Teams Work", href: "/dashboard/teams-work", icon: ClipboardCheck, section: "main", featureKey: "teams_work" },
  { label: "KCM Membership", href: "/dashboard/kcm-membership", icon: Crown, section: "main", featureKey: "kcm_membership" },
  { label: "Users", href: "/dashboard/users", icon: Users, section: "main", adminOnly: true },
  { label: "Logs", href: "/dashboard/logs", icon: Activity, section: "main", adminOnly: true },
  { label: "Applications", href: "/dashboard/applications", icon: Briefcase, section: "main", adminOnly: true },
  { label: "Job board", href: "/dashboard/job-listings", icon: ClipboardList, section: "main", adminOnly: true },
  { label: "Inquiries", href: "/dashboard/inquiries", icon: Inbox, section: "main", adminOnly: true },
  { label: "Nominate", href: "/dashboard/nominations", icon: Star, section: "main", adminOnly: true },
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
  const type = String(currentType ?? "").toLowerCase();
  const isTypedCampaignList =
    pathname === "/dashboard/campaigns" && (type === "ticket" || type === "vote");

  if (path === "/dashboard/campaigns") {
    if (expectedType === "ticket" || expectedType === "vote") {
      return pathname === "/dashboard/campaigns" && type === expectedType;
    }
    if (pathname === "/dashboard/campaigns") return !isTypedCampaignList;
    return true;
  }

  if (!expectedType) return true;
  return type === expectedType.toLowerCase();
}

function isVisitorSection(pathname: string) {
  return pathname === VISITOR_MANAGEMENT_PATH || pathname.startsWith(`${VISITOR_MANAGEMENT_PATH}/`);
}

function isContestantsSection(pathname: string) {
  return pathname === "/dashboard/contestants" || pathname.startsWith("/dashboard/contestants/");
}

function isNestedLinkActive(pathname: string, href: string) {
  if (href === "/dashboard/contestants") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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
  nestedNavOpen,
  setNestedNavOpen,
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
  nestedNavOpen: boolean;
  setNestedNavOpen: (open: boolean) => void;
  showLabels: boolean;
  onNavigate?: () => void;
  pendingApplicationsCount: number;
  pendingCmfaCount: number;
  isAdmin: boolean;
  adminOwnerId: string | null;
}) {
  const Icon = item.icon;

  if (item.nestedLinks?.length) {
    const visibleLinks = item.nestedLinks.filter((link) => !link.adminOnly || isAdmin);
    const extraLinks = visibleLinks.filter((link) => link.href !== item.href);
    const parentActive = isContestantsSection(pathname);
    const isOpen = showLabels && (nestedNavOpen || parentActive);

    if (showLabels && extraLinks.length > 0) {
      return (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setNestedNavOpen(!nestedNavOpen)}
            className={`group flex w-full items-center rounded-r-md transition-colors ${
              parentActive ? NAV_ACTIVE : NAV_IDLE
            } gap-3 px-3 py-2.5`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${parentActive ? NAV_ICON_ACTIVE : NAV_ICON_IDLE}`}
            />
            <span className="text-sm font-semibold truncate flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isOpen ? (
            <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
              {visibleLinks.map((link) => {
                const childActive = isNestedLinkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    onClick={onNavigate}
                    className={`block rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                      childActive ? NAV_CHILD_ACTIVE : NAV_CHILD_IDLE
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }
  }

  if (item.children?.length) {
    const parentActive = isVisitorSection(pathname);
    const isOpen = showLabels && (visitorNavOpen || parentActive);

    if (!showLabels) {
      return (
        <Link
          href={item.href}
          prefetch={false}
          onClick={onNavigate}
          className={`group flex items-center justify-center rounded-r-md px-2 py-2.5 transition-colors ${
            parentActive ? NAV_ACTIVE : NAV_IDLE
          }`}
          title={item.label}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${parentActive ? NAV_ICON_ACTIVE : NAV_ICON_IDLE}`}
          />
        </Link>
      );
    }

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setVisitorNavOpen(!visitorNavOpen)}
          className={`group flex w-full items-center rounded-r-md transition-colors ${
            parentActive ? NAV_ACTIVE : NAV_IDLE
          } gap-3 px-3 py-2.5`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${parentActive ? NAV_ICON_ACTIVE : NAV_ICON_IDLE}`}
          />
          <span className="text-sm font-semibold truncate flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen ? (
          <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
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
                      childActive ? NAV_CHILD_ACTIVE : NAV_CHILD_IDLE
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
      className={`group flex items-center rounded-r-md transition-colors ${
        active ? NAV_ACTIVE : NAV_IDLE
      } ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"}`}
      title={!showLabels ? item.label : undefined}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${active ? NAV_ICON_ACTIVE : NAV_ICON_IDLE}`}
      />
      {showLabels && (
        <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.href === "/dashboard/applications" && pendingApplicationsCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-primary-700 text-white text-[10px] font-extrabold flex-shrink-0">
              {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
            </span>
          )}
          {item.href === "/dashboard/gate" && pendingCmfaCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-primary-700 text-white text-[10px] font-extrabold flex-shrink-0">
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
  const { isAdmin, isPortalMember, loading: portalLoading, tier, hasFeature, isEmployer, isVisitorOnly, isManager, isFullAdmin, role } =
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
            VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
            VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_NAV_CHILD,
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
        VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD,
        VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_NAV_CHILD,
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
  const [contestantsNavOpen, setContestantsNavOpen] = useState(() => isContestantsSection(pathname));

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
  const [now, setNow] = useState(() => new Date());
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [pendingCmfaCount, setPendingCmfaCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const breadcrumbTail = active === "Dashboard" ? "Overview" : active;

  const clockLabel = useMemo(() => {
    try {
      const datePart = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Nairobi",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now);
      const timePart = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      return `${datePart} | ${timePart}`;
    } catch {
      return now.toLocaleString();
    }
  }, [now]);

  const displayName = user?.name || user?.email || "Admin";
  const initials = String(displayName).trim().charAt(0).toUpperCase() || "A";
  const roleLabel = isFullAdmin
    ? "Administrator"
    : isManager
      ? "Manager"
      : isEmployer
        ? "Employer"
        : isVisitorOnly
          ? "Visitor management"
          : role
            ? `${role.charAt(0).toUpperCase()}${role.slice(1)}`
            : "Member";
  const noticeCount = pendingApplicationsCount + pendingCmfaCount;
  const noticeHref =
    pendingApplicationsCount > 0
      ? "/dashboard/applications"
      : pendingCmfaCount > 0
        ? "/dashboard/gate"
        : null;

  // Avoid flashing private shell while auth pages redirect.
  if (authLoading || portalLoading || !isAuthenticated || !isPortalMember) {
    return <>{children}</>;
  }

  const sections: Array<{ key: NavItem["section"]; label: string }> = [
    { key: "main", label: "Main Navigation" },
    { key: "manage", label: "Manage Menu" },
    { key: "settings", label: "Application Settings" },
  ];

  const isTicketingVotingWorkspace =
    pathname === "/dashboard/campaigns" &&
    (String(currentType ?? "").toLowerCase() === "ticket" || String(currentType ?? "").toLowerCase() === "vote");
  const isWidePage =
    isLeaveManagementPage ||
    isLeaveSettingsPage ||
    isSummaryReportsPage ||
    isPerEmployeeReportPage ||
    isEmployeesPage ||
    isVisitorManagementPage ||
    isTicketingVotingWorkspace;
  const isDashboardHome = pathname === "/dashboard";

  const renderSectionNav = (showLabels: boolean, onNavigate?: () => void) =>
    sections.map((s) => (
      <div key={s.key}>
        {showLabels ? (
          <div className="px-3 text-[10px] font-bold tracking-[0.18em] uppercase text-primary-700">
            {s.label}
          </div>
        ) : null}
        <div className={`${showLabels ? "mt-2" : "mt-1"} space-y-0.5`}>
          {navItems
            .filter((x) => x.section === s.key && canSeeItem(x))
            .map((item) => (
              <DashboardNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                currentType={currentType}
                visitorIndustry={visitorIndustry}
                visitorNavOpen={visitorNavOpen}
                setVisitorNavOpen={setVisitorNavOpen}
                nestedNavOpen={item.href === "/dashboard/contestants" ? contestantsNavOpen : false}
                setNestedNavOpen={item.href === "/dashboard/contestants" ? setContestantsNavOpen : () => {}}
                showLabels={showLabels}
                onNavigate={onNavigate}
                pendingApplicationsCount={pendingApplicationsCount}
                pendingCmfaCount={pendingCmfaCount}
                isAdmin={isAdmin}
                adminOwnerId={adminOwnerId}
              />
            ))}
        </div>
      </div>
    ));

  const noticeControl = (
    <span className="relative inline-flex">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10">
        <Bell className="h-[18px] w-[18px]" />
      </span>
      {noticeCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-secondary-500 px-1 text-[10px] font-bold text-white ring-2 ring-primary-800">
          {noticeCount > 99 ? "99+" : noticeCount}
        </span>
      ) : null}
    </span>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#e8edf3]">
      <header className="relative z-30 h-[58px] flex-shrink-0 bg-primary-800 text-white flex items-center gap-2 sm:gap-4 px-3 sm:px-5 shadow-[0_2px_10px_rgba(15,47,100,0.22)]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGO_URL}
            alt="CMFAgency"
            className="h-9 w-9 rounded-md object-contain bg-white/10 p-0.5 flex-shrink-0"
          />
          <div className="min-w-0 hidden sm:block">
            <div className="text-[13px] sm:text-sm font-bold tracking-wide leading-tight truncate">Fusion Xpress</div>
            <div className="text-[10px] sm:text-[11px] text-white/65 leading-tight truncate">CMFAgency admin dashboard</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4 min-w-0">
          {noticeHref ? (
            <Link href={noticeHref} prefetch={false} aria-label="Pending items">
              {noticeControl}
            </Link>
          ) : (
            <span aria-hidden="true">{noticeControl}</span>
          )}

          <div className="flex items-center gap-2.5 min-w-0 pl-2 sm:pl-3 border-l border-white/15">
            <div className="hidden sm:block min-w-0 text-right">
              <div className="text-sm font-semibold truncate max-w-[180px]">{displayName}</div>
              <div className="text-[11px] text-white/65 truncate">{roleLabel}</div>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20">
              {initials}
            </span>
            <button
              type="button"
              onClick={handleDashboardLogout}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside
          className={`hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-slate-200/80 overflow-hidden transition-[width] duration-300 ease-out ${
            showDesktopSidebarFull ? "w-[16.5rem]" : "w-[4.25rem]"
          }`}
          onMouseEnter={() => {
            if (sidebarCollapsed) setSidebarHoverExpanded(true);
          }}
          onMouseLeave={() => setSidebarHoverExpanded(false)}
        >
          <div
            className={`relative h-11 flex items-center border-b border-slate-100 ${
              showDesktopSidebarFull ? "justify-end px-3" : "justify-center px-2"
            }`}
          >
            {showDesktopSidebarFull ? (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Collapse sidebar"
                title="Collapse to icons"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-50 hover:text-primary-700"
                aria-label="Pin sidebar open"
                title="Keep sidebar open"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${showDesktopSidebarFull ? "px-2.5" : "px-2"}`}>
            {renderSectionNav(showDesktopSidebarFull)}
          </nav>

          <div className={`mt-auto border-t border-slate-100 ${showDesktopSidebarFull ? "p-3" : "p-2"}`}>
            <button
              type="button"
              onClick={handleDashboardLogout}
              className={`w-full inline-flex items-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800 ${
                showDesktopSidebarFull ? "justify-start gap-2.5 px-3 py-2.5 text-sm font-semibold" : "justify-center h-10"
              }`}
              title="Sign out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {showDesktopSidebarFull ? <span>Sign out</span> : null}
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-10 h-full w-[min(20rem,85vw)] max-w-[85vw] flex flex-col bg-white border-r border-slate-200 shadow-2xl">
              <div className="h-[58px] flex items-center justify-between gap-3 px-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BRAND_LOGO_URL}
                    alt=""
                    className="h-9 w-9 rounded-md object-contain bg-primary-50 p-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 leading-tight">Fusion Xpress</div>
                    <div className="text-[11px] text-slate-500 leading-tight truncate">CMFAgency admin dashboard</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md text-slate-500 hover:bg-slate-50"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">{renderSectionNav(true, () => setMobileOpen(false))}</nav>

              <div className="p-3 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void handleDashboardLogout();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary-800 text-white font-semibold hover:bg-primary-900"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="bg-primary-700 text-white px-4 sm:px-7 pt-6 pb-5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-left leading-tight">{active}</h1>
                <p className="mt-1.5 text-sm text-white/80 text-left">
                  Welcome, {displayName}.
                </p>
              </div>
              <p className="hidden md:block text-sm text-white/70 max-w-xs text-right leading-relaxed">
                <span className="font-medium text-white/90">Dashboard</span>
                <span className="mx-1.5 text-white/40">/</span>
                {breadcrumbTail}
              </p>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="inline-flex items-center gap-2 text-[13px] text-white/90">
                <Calendar className="w-4 h-4 text-white/75 flex-shrink-0" />
                <span className="font-medium tabular-nums">{clockLabel}</span>
              </div>
              <div className="sm:ml-auto w-full sm:w-auto sm:min-w-[240px] max-w-md">
                <label className="flex items-center gap-2 bg-white rounded-md h-9 px-3 shadow-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 min-w-0"
                  />
                </label>
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 sm:px-6 pb-8 pt-6">
            <div className={isWidePage ? "max-w-none" : "mx-auto max-w-[1280px]"}>
              <div
                className={
                  isWidePage || isDashboardHome || isTicketingVotingWorkspace
                    ? "p-0"
                    : "rounded-[12px] bg-white p-4 sm:p-6 md:p-8 shadow-[0_10px_28px_rgba(15,47,100,0.07)] ring-1 ring-black/[0.04]"
                }
              >
                {isVisitorOnly && !isAdmin ? <VisitorTrialBanner /> : null}
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="h-8 flex-shrink-0 bg-primary-800 text-white/75 text-[11px] tracking-wide flex items-center justify-center">
        Fusion Xpress · CMFAgency
      </footer>
    </div>
  );
}
