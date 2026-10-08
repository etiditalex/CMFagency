"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  Facebook,
  Instagram,
  LayoutDashboard,
  LayoutPanelLeft,
  Image as ImageIcon,
  Mail,
  Menu,
  MessagesSquare,
  PieChart,
  Plus,
  Quote,
  ClipboardList,
  Crown,
  QrCode,
  Radio,
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
  ChevronDown,
  Bell,
  Settings,
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
  VISITOR_MANAGEMENT_BIOMETRIC_NAV_CHILD,
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
  icon: typeof LayoutDashboard;
  section: "home" | "campaigns_voting" | "access_events" | "teams_membership" | "commerce" | "administration";
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

const NAV_ACTIVE = "fx-nav-active bg-white text-ink shadow-[0_1px_3px_rgba(21,19,33,0.08)]";
const NAV_IDLE = "text-ink hover:bg-white/80";
const NAV_EXPAND_IDLE = "text-ink hover:bg-white/70";
const NAV_CHILD_ACTIVE = "fx-nav-active bg-white text-ink shadow-[0_1px_2px_rgba(21,19,33,0.06)]";
const NAV_CHILD_IDLE = "text-ink-muted hover:bg-white/70 hover:text-ink";
const NAV_SUBTREE = "ml-1 space-y-0.5 py-0.5 pl-1";
const NAV_ICON_TONES = [
  "text-negative",
  "text-brand",
  "text-fx-warn",
  "text-accent-teal",
  "text-accent-green",
  "text-brand-dark",
  "text-secondary-600",
  "text-primary-500",
];

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "home" },
  {
    label: "Sales & votes",
    href: "/dashboard/insights",
    icon: PieChart,
    section: "campaigns_voting",
    featureKey: "reports",
  },
  { label: "Voting", href: "/dashboard/campaigns?type=vote", icon: Vote, section: "campaigns_voting", featureKey: "voting" },
  { label: "Polling Fx", href: "/dashboard/polling-fx", icon: Radio, section: "campaigns_voting", adminOnly: true },
  { label: "Vote visibility", href: "/dashboard/voting/settings", icon: EyeOff, section: "campaigns_voting", featureKey: "voting" },
  {
    label: "Contestants",
    href: "/dashboard/contestants",
    icon: UserPlus,
    section: "campaigns_voting",
    featureKey: "voting",
    nestedLinks: [
      { label: "All contestants", href: "/dashboard/contestants" },
      { label: "Download results", href: "/dashboard/contestants/results", adminOnly: true },
    ],
  },
  { label: "All Campaigns", href: "/dashboard/campaigns", icon: BarChart3, section: "campaigns_voting", featureKeysAny: ["ticketing", "voting"] },
  { label: "Ticketing", href: "/dashboard/campaigns?type=ticket", icon: Ticket, section: "access_events", featureKey: "ticketing" },
  { label: "Gate", href: "/dashboard/gate", icon: ScanLine, section: "access_events", featureKey: "reports" },
  { label: "FX QR Code Generator", href: "/dashboard/fx-qr-code-generator", icon: QrCode, section: "access_events" },
  {
    label: "Visitor Management",
    href: VISITOR_MANAGEMENT_PATH,
    icon: UserCheck,
    section: "access_events",
    featureKey: "visitor_management",
    children: [...VISITOR_MANAGEMENT_NAV_CHILDREN],
  },
  { label: "Teams Work", href: "/dashboard/teams-work", icon: ClipboardCheck, section: "teams_membership", featureKey: "teams_work" },
  { label: "KCM Membership", href: "/dashboard/kcm-membership", icon: Crown, section: "teams_membership", featureKey: "kcm_membership" },
  { label: "Transactions", href: "/dashboard/transactions", icon: Download, section: "commerce", featureKey: "reports" },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText, section: "commerce" },
  { label: "Receipts", href: "/dashboard/receipts", icon: Receipt, section: "commerce" },
  {
    label: "Smart Management Invoice",
    href: "/dashboard/smart-management-invoice",
    icon: FileText,
    section: "commerce",
  },
  { label: "Quotation", href: "/dashboard/quotations", icon: FilePenLine, section: "commerce" },
  { label: "Merchandise", href: "/dashboard/merchandise", icon: ShoppingBag, section: "commerce", adminOnly: true },
  { label: "New Campaign", href: "/dashboard/campaigns/new", icon: Plus, section: "commerce", featureKey: "create_campaign" },
  { label: "Payouts", href: "/dashboard/payouts", icon: Wallet, section: "commerce", featureKey: "payouts" },
  { label: "Coupons", href: "/dashboard/coupons", icon: BadgePercent, section: "commerce", featureKey: "coupons" },
  { label: "Users", href: "/dashboard/users", icon: Users, section: "administration", adminOnly: true },
  { label: "Logs", href: "/dashboard/logs", icon: Activity, section: "administration", adminOnly: true },
  { label: "Settings", href: "/dashboard/account", icon: User, section: "administration" },
  { label: "Applications", href: "/dashboard/applications", icon: Briefcase, section: "administration", adminOnly: true },
  { label: "Job board", href: "/dashboard/job-listings", icon: ClipboardList, section: "administration", adminOnly: true },
  { label: "Inquiries", href: "/dashboard/inquiries", icon: Inbox, section: "administration", adminOnly: true },
  { label: "Nominate", href: "/dashboard/nominations", icon: Star, section: "administration", adminOnly: true },
  { label: "Gallery", href: "/dashboard/gallery", icon: ImageIcon, section: "administration", adminOnly: true },
  { label: "Testimonials", href: "/dashboard/testimonials", icon: Quote, section: "administration", adminOnly: true },
  { label: "Blogs", href: "/dashboard/blogs", icon: BookOpen, section: "administration", adminOnly: true },
  { label: "Blog sidebar ads", href: "/dashboard/blogs/sidebar-ads", icon: LayoutPanelLeft, section: "administration", adminOnly: true },
  { label: "Pages", href: "/dashboard/pages", icon: FilePenLine, section: "administration", adminOnly: true },
  { label: "Events", href: "/dashboard/events", icon: Calendar, section: "administration", featureKey: "events" },
  { label: "Registrations", href: "/dashboard/registrations", icon: ClipboardList, section: "administration", adminOnly: true },
  { label: "Managers", href: "/dashboard/managers", icon: UserCog, section: "administration", featureKey: "managers" },
  { label: "Email", href: "/dashboard/email", icon: MessagesSquare, section: "administration", featureKey: "email" },
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
  iconClassName = "text-ink-muted",
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
  iconClassName?: string;
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

    if (!showLabels && extraLinks.length > 0) {
      return (
        <Link
          href={item.href}
          prefetch={false}
          onClick={onNavigate}
          className={`group flex items-center justify-center rounded-sm px-2 py-2 transition-colors duration-200 ${
            parentActive ? NAV_ACTIVE : NAV_EXPAND_IDLE
          }`}
          title={item.label}
        >
          <Icon strokeWidth={1.75} className={`h-[18px] w-[18px] flex-shrink-0 ${iconClassName}`} />
        </Link>
      );
    }

    if (showLabels && extraLinks.length > 0) {
      return (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setNestedNavOpen(!nestedNavOpen)}
            className={`group flex w-full items-center rounded-sm transition-colors duration-200 ${
              parentActive ? NAV_ACTIVE : NAV_EXPAND_IDLE
            } gap-3 px-3 py-2`}
          >
            <Icon strokeWidth={1.75} className={`h-[18px] w-[18px] flex-shrink-0 ${iconClassName}`} />
            <span className="text-[13px] font-medium truncate flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isOpen ? (
            <div className={NAV_SUBTREE}>
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
          className={`group flex items-center justify-center rounded-sm px-2 py-2 transition-colors duration-200 ${
            parentActive ? NAV_ACTIVE : NAV_EXPAND_IDLE
          }`}
          title={item.label}
        >
          <Icon strokeWidth={1.75} className={`h-[18px] w-[18px] flex-shrink-0 ${iconClassName}`} />
        </Link>
      );
    }

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setVisitorNavOpen(!visitorNavOpen)}
          className={`group flex w-full items-center rounded-sm transition-colors duration-200 ${
            parentActive ? NAV_ACTIVE : NAV_EXPAND_IDLE
          } gap-3 px-3 py-2`}
        >
          <Icon strokeWidth={1.75} className={`h-[18px] w-[18px] flex-shrink-0 ${iconClassName}`} />
          <span className="text-[13px] font-medium truncate flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen ? (
          <div className={NAV_SUBTREE}>
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
      className={`group flex items-center rounded-sm transition-colors duration-200 ${
        active ? NAV_ACTIVE : NAV_IDLE
      } ${showLabels ? "gap-3 px-3 py-2" : "justify-center px-2 py-2"}`}
      title={!showLabels ? item.label : undefined}
    >
      <Icon strokeWidth={1.75} className={`h-[18px] w-[18px] flex-shrink-0 ${iconClassName}`} />
      {showLabels && (
        <span className="text-[13px] font-medium flex items-center gap-2 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.href === "/dashboard/applications" && pendingApplicationsCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold flex-shrink-0">
              {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
            </span>
          )}
          {item.href === "/dashboard/gate" && pendingCmfaCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold flex-shrink-0">
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
            VISITOR_MANAGEMENT_BIOMETRIC_NAV_CHILD,
            VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
            VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
            VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD,
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
        VISITOR_MANAGEMENT_BIOMETRIC_NAV_CHILD,
        VISITOR_MANAGEMENT_LEAVE_NAV_CHILD,
        VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD,
        VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD,
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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

  const breadcrumbTail = active === "Dashboard" ? "Overview" : active;

  const displayName = user?.name || user?.email || "Admin";
  const initials = (() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return String(displayName).trim().slice(0, 2).toUpperCase() || "A";
  })();
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

  const workSections: Array<{ key: NavItem["section"]; label: string }> = [
    { key: "campaigns_voting", label: "Campaigns & Voting" },
    { key: "access_events", label: "Access & Events" },
    { key: "teams_membership", label: "Teams & Membership" },
    { key: "commerce", label: "Commerce" },
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

  const renderNavItem = (
    item: NavItem,
    showLabels: boolean,
    onNavigate: (() => void) | undefined,
    iconClassName: string
  ) => (
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
      iconClassName={iconClassName}
      pendingApplicationsCount={pendingApplicationsCount}
      pendingCmfaCount={pendingCmfaCount}
      isAdmin={isAdmin}
      adminOwnerId={adminOwnerId}
    />
  );

  const renderGroupedSection = (
    key: NavItem["section"],
    showLabels: boolean,
    items: NavItem[],
    onNavigate: (() => void) | undefined,
    toneCursor: { i: number }
  ) => {
    if (items.length === 0) return null;
    return (
      <div key={key} className="mt-1 space-y-0.5">
        {items.map((item) => {
          const tone = NAV_ICON_TONES[toneCursor.i % NAV_ICON_TONES.length];
          toneCursor.i += 1;
          return renderNavItem(item, showLabels, onNavigate, tone);
        })}
      </div>
    );
  };

  const dashboardItem = navItems.find((x) => x.section === "home" && canSeeItem(x));
  const adminItems = navItems.filter((x) => x.section === "administration" && canSeeItem(x));

  const renderSectionNav = (showLabels: boolean, onNavigate?: () => void) => {
    const toneCursor = { i: 0 };
    const nextTone = () => {
      const tone = NAV_ICON_TONES[toneCursor.i % NAV_ICON_TONES.length];
      toneCursor.i += 1;
      return tone;
    };
    return (
      <>
        {dashboardItem ? renderNavItem(dashboardItem, showLabels, onNavigate, nextTone()) : null}
        {workSections.map((s) =>
          renderGroupedSection(
            s.key,
            showLabels,
            navItems.filter((x) => x.section === s.key && canSeeItem(x)),
            onNavigate,
            toneCursor
          )
        )}
        {adminItems.length > 0
          ? renderGroupedSection("administration", showLabels, adminItems, onNavigate, toneCursor)
          : null}
      </>
    );
  };

  const quickActions = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, className: "bg-brand", show: true },
    {
      href: "/dashboard/insights",
      label: "Sales and votes",
      icon: PieChart,
      className: "bg-accent-green",
      show: hasFeature("reports"),
    },
    {
      href: VISITOR_MANAGEMENT_PATH,
      label: "Visitor management",
      icon: Users,
      className: "bg-accent-teal",
      show: hasFeature("visitor_management"),
    },
    {
      href: "/dashboard/campaigns",
      label: "Campaigns",
      icon: Briefcase,
      className: "bg-fx-warn",
      show: hasFeature("ticketing") || hasFeature("voting") || isAdmin,
    },
    {
      href: "/dashboard/events",
      label: "Events",
      icon: Calendar,
      className: "bg-brand-dark",
      show: hasFeature("events") || isAdmin,
    },
  ]
    .filter((action) => action.show)
    .slice(0, 4);

  const renderQuickActions = (showLabels: boolean, onNavigate?: () => void) => (
    <div className={`flex gap-2 px-3 pb-3 pt-3 ${showLabels ? "flex-row" : "flex-col items-center"}`}>
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            prefetch={false}
            onClick={onNavigate}
            title={action.label}
            className={`inline-flex h-8 w-8 items-center justify-center text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${action.className}`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </Link>
        );
      })}
    </div>
  );

  const mailHref = isAdmin ? "/dashboard/inquiries" : hasFeature("email") ? "/dashboard/email" : "/dashboard/account";
  const bellHref = noticeHref ?? (isAdmin ? "/dashboard/applications" : "/dashboard/gate");

  const headerBadge = (count: number) =>
    count > 0 ? (
      <span className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-fx-warn px-1 text-[10px] font-bold text-white">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  return (
    <div className="fx-dashboard flex min-h-screen flex-col bg-[#e7edf3]">
      <header className="relative z-30 flex h-12 flex-shrink-0 items-center gap-1 bg-brand px-3 text-white sm:gap-2 sm:px-4">
        <div className="min-w-0 truncate text-[15px] font-bold tracking-wide">Fusion Xpress</div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center text-white/90 hover:bg-white/10 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="hidden h-9 w-9 items-center justify-center text-white/90 hover:bg-white/10 lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link
            href={mailHref}
            prefetch={false}
            aria-label="Messages"
            className="relative inline-flex h-9 w-9 items-center justify-center text-white/90 hover:bg-white/10"
          >
            <Mail className="h-[18px] w-[18px]" />
            {headerBadge(pendingApplicationsCount)}
          </Link>
          <Link
            href={bellHref}
            prefetch={false}
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center text-white/90 hover:bg-white/10"
          >
            <Bell className="h-[18px] w-[18px]" />
            {headerBadge(pendingCmfaCount)}
          </Link>

          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-white/10"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {initials}
              </span>
              <span className="hidden max-w-[160px] truncate text-sm sm:inline">Welcome, {displayName}</span>
              <ChevronDown
                className={`hidden h-4 w-4 transition-transform duration-200 sm:block ${accountMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {accountMenuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close account menu"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-52 border border-hairline bg-white py-1 text-ink shadow-lg" role="menu">
                  <div className="px-3 py-2 text-xs text-ink-muted">{roleLabel}</div>
                  <Link
                    href="/dashboard/account"
                    prefetch={false}
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-canvas"
                  >
                    <Settings className="h-4 w-4" />
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={handleDashboardLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-canvas"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`hidden flex-shrink-0 flex-col overflow-hidden border-r border-[#d5dde6] bg-[#e7edf3] transition-[width] duration-300 ease-out lg:flex ${
            showDesktopSidebarFull ? "w-60" : "w-[4.25rem]"
          }`}
          onMouseEnter={() => {
            if (sidebarCollapsed) setSidebarHoverExpanded(true);
          }}
          onMouseLeave={() => setSidebarHoverExpanded(false)}
        >
          {renderQuickActions(showDesktopSidebarFull)}
          <nav className={`flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 ${showDesktopSidebarFull ? "px-2" : "px-1.5"}`}>
            {renderSectionNav(showDesktopSidebarFull)}
          </nav>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className="relative z-10 flex h-full w-[min(18rem,85vw)] max-w-[85vw] flex-col border-r border-[#d5dde6] bg-[#e7edf3] shadow-xl">
              <div className="flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-[#d5dde6] px-3">
                <div className="text-sm font-bold text-ink">Fusion Xpress</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center text-ink-muted hover:bg-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderQuickActions(true, () => setMobileOpen(false))}
              <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
                {renderSectionNav(true, () => setMobileOpen(false))}
              </nav>
              <div className="border-t border-[#d5dde6] p-3">
                <button
                  type="button"
                  onClick={handleDashboardLogout}
                  className="flex w-full items-center gap-2 px-2 py-2 text-sm text-ink hover:bg-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="bg-white px-4 pb-1 pt-4 sm:px-5">
            <h1 className="text-[15px] font-semibold text-ink">
              Fusion Xpress
              <span className="mx-2 font-normal text-ink-muted">»</span>
              <span className="font-normal text-ink-muted">{breadcrumbTail}</span>
            </h1>
          </div>
          <main className="flex-1 px-4 pb-8 pt-3 sm:px-5">
            <div className={isWidePage ? "max-w-none" : "mx-auto max-w-[1280px]"}>
              <div
                key={`${pathname}:${currentType ?? ""}`}
                className={`fx-page-in ${
                  isWidePage || isDashboardHome || isTicketingVotingWorkspace
                    ? "p-0"
                    : "border border-hairline bg-surface p-4 sm:p-6 md:p-8"
                }`}
              >
                {isVisitorOnly && !isAdmin ? <VisitorTrialBanner /> : null}
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="flex h-12 flex-shrink-0 items-center justify-center gap-3 border-t border-hairline bg-white text-[12px] text-brand">
        <span>Fusion Xpress · CMFAgency © {new Date().getFullYear()}</span>
        <a
          href="https://www.facebook.com/share/187Kse9GrQ/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-brand hover:text-brand-dark"
        >
          <Facebook className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://www.instagram.com/changerfusions?igsh=bzk0dWM0ZzJsbGxt&utm_source=ig_contact_invite"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-brand hover:text-brand-dark"
        >
          <Instagram className="h-3.5 w-3.5" />
        </a>
      </footer>
    </div>
  );
}
