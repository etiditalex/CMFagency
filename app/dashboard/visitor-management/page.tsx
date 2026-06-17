"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Copy,
  Eye,
  Flame,
  Link2,
  LogIn,
  LogOut,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import MockQrCode from "@/components/fusion-xpress/visitor-management/MockQrCode";
import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import RegisterGuestModal from "@/components/fusion-xpress/visitor-management/RegisterGuestModal";
import type { RegisterGuestPayload } from "@/components/fusion-xpress/visitor-management/RegisterGuestForm";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_INDUSTRIES,
  industryCheckInUrl,
  industryLabel,
  isVisitorIndustrySlug,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";
import { MOCK_VISITORS } from "@/lib/visitors/mock-data";
import type { VisitorDemoSubmission, VisitorRecord, VisitorStatus } from "@/lib/visitors/types";
import {
  formatActualCheckDetail,
  formatActualCheckTimes,
  formatVisitDateTime,
  statusBadgeClass,
  statusLabel,
  visitorStats,
} from "@/lib/visitors/utils";

const DEFAULT_INDUSTRY = "retail-hospitality";

export default function DashboardVisitorManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isAdmin, isVisitorOnly } = usePortal();
  const {
    needsSelection,
    appendOwnerQuery,
    ownerId: adminOwnerId,
    industry: scopedIndustry,
    businessName: scopedBusinessName,
  } = useAdminBusinessScope();

  const industryFilter = useMemo(() => {
    const param = searchParams?.get("industry");
    if (!param || param === "all") return "all";
    return isVisitorIndustrySlug(param) ? param : DEFAULT_INDUSTRY;
  }, [searchParams]);

  const [organizationIndustry, setOrganizationIndustry] = useState(DEFAULT_INDUSTRY);

  useEffect(() => {
    if (!user?.id) return;
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const slug = String(meta?.organization_industry ?? "").trim();
      if (isVisitorIndustrySlug(slug)) setOrganizationIndustry(slug);
    });
  }, [user?.id]);

  const registerIndustrySlug = isAdmin
    ? scopedIndustry && isVisitorIndustrySlug(scopedIndustry)
      ? scopedIndustry
      : organizationIndustry
    : industryFilter === "all"
      ? organizationIndustry
      : industryFilter;

  const activityOwnerId = isAdmin ? adminOwnerId : user?.id ?? "";

  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [demoSubmissions, setDemoSubmissions] = useState<VisitorDemoSubmission[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(true);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [detailVisitor, setDetailVisitor] = useState<VisitorRecord | null>(null);
  const [qrPreview, setQrPreview] = useState<VisitorRecord | null>(null);
  const [registerGuestOpen, setRegisterGuestOpen] = useState(false);
  const [registerGuestNotice, setRegisterGuestNotice] = useState<string | null>(null);
  const [checkInLinkCopied, setCheckInLinkCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const publicCheckInUrl = useMemo(() => {
    if (!activityOwnerId) return "";
    return industryCheckInUrl(
      registerIndustrySlug,
      activityOwnerId,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
  }, [activityOwnerId, registerIndustrySlug]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadVisitors = useCallback(async (industrySlug?: string) => {
    if (isAdmin && needsSelection) {
      setVisitors([]);
      setLoadingVisitors(false);
      return;
    }
    setLoadingVisitors(true);
    setLoadError(null);
    setSetupRequired(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");

      const qsParts: string[] = [];
      if (industrySlug && industrySlug !== "all") {
        qsParts.push(`industrySlug=${encodeURIComponent(industrySlug)}`);
      }
      const base = qsParts.length ? `/api/visitors?${qsParts.join("&")}` : "/api/visitors";
      const res = await fetch(appendOwnerQuery(base), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        visitors?: VisitorRecord[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(json.error ?? "Failed to load visitors");

      if (json.setupRequired) {
        setSetupRequired(true);
        setUsingMockData(true);
        setVisitors(MOCK_VISITORS);
        setLoadError(json.message ?? null);
        return;
      }

      setUsingMockData(false);
      setVisitors(Array.isArray(json.visitors) ? json.visitors : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load visitors";
      setLoadError(msg);
      setUsingMockData(true);
      setVisitors(MOCK_VISITORS);
    } finally {
      setLoadingVisitors(false);
    }
  }, [getToken, isAdmin, needsSelection, appendOwnerQuery]);

  const loadDemoSubmissions = useCallback(
    async (industrySlug?: string) => {
      setLoadingDemos(true);
      try {
        const token = await getToken();
        if (!token) return;

        const qs =
          industrySlug && industrySlug !== "all"
            ? `?industrySlug=${encodeURIComponent(industrySlug)}`
            : "";
        const res = await fetch(`/api/visitors/demo-submissions${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          submissions?: VisitorDemoSubmission[];
        };
        if (res.ok && Array.isArray(json.submissions)) {
          setDemoSubmissions(json.submissions);
        } else {
          setDemoSubmissions([]);
        }
      } catch {
        setDemoSubmissions([]);
      } finally {
        setLoadingDemos(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (isVisitorOnly && industryFilter !== "all") {
      router.replace(VISITOR_MANAGEMENT_PATH);
    }
  }, [authLoading, portalLoading, isVisitorOnly, industryFilter, router]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
      return;
    }
    loadVisitors(isAdmin ? undefined : industryFilter);
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    isAdmin,
    router,
    user,
    loadVisitors,
    industryFilter,
    needsSelection,
  ]);

  const stats = useMemo(() => visitorStats(visitors), [visitors]);
  const filteredVisitors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visitors;
    return visitors.filter((v) => {
      const haystack = [
        v.fullName,
        v.phoneNumber,
        v.host,
        v.purposeOfVisit,
        v.idPassportNumber ?? "",
        industryLabel(v.industrySlug),
        statusLabel(v.status),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [visitors, searchTerm]);

  const incomingVisitors = useMemo(
    () => visitors.filter((v) => v.status === "pending").slice(0, 5),
    [visitors]
  );
  const formatVisitorPassId = useCallback((v: VisitorRecord, index: number) => {
    const compactDate = String(v.visitDate ?? "")
      .replaceAll("-", "")
      .slice(-6);
    const serial = String(index + 1).padStart(3, "0");
    return `${compactDate || "VIS"}-${serial}`;
  }, []);

  const updateVisitor = useCallback((id: string, patch: Partial<VisitorRecord>) => {
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v
      )
    );
    setDetailVisitor((d) => (d?.id === id ? { ...d, ...patch } : d));
  }, []);

  const setStatus = useCallback(
    async (id: string, status: VisitorStatus) => {
      if (usingMockData) {
        if (status === "approved") {
          updateVisitor(id, { status, qrCodeToken: `FX-VIS-${id}` });
        } else if (status === "rejected") {
          updateVisitor(id, { status, qrCodeToken: null });
        } else {
          updateVisitor(id, { status });
        }
        return;
      }

      setPatchingId(id);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch(`/api/visitors/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          visitor?: VisitorRecord;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to update visitor");
        if (json.visitor) updateVisitor(id, json.visitor);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setPatchingId(null);
      }
    },
    [updateVisitor, getToken, usingMockData]
  );

  const handleRegisterGuest = useCallback(
    async (payload: RegisterGuestPayload) => {
      if (usingMockData) {
        throw new Error(
          "Run database/visitor_management_patch_01.sql in Supabase to save visitors."
        );
      }
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          industrySlug: payload.industrySlug ?? registerIndustrySlug,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        visitor?: VisitorRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to register guest");
      if (json.visitor) {
        setVisitors((prev) => [json.visitor!, ...prev]);
        await loadVisitors(industryFilter);
        setRegisterGuestNotice(`${json.visitor.fullName} registered. Approve them in the list below.`);
      }
    },
    [usingMockData, getToken, registerIndustrySlug, industryFilter, loadVisitors]
  );

  const statCards = [
    { label: "Total Visitors", value: stats.total, icon: Users, tone: "text-primary-700 bg-primary-50/70 border-primary-100" },
    { label: "Checked-in", value: stats.checkedIn, icon: LogIn, tone: "text-primary-700 bg-primary-50/70 border-primary-100" },
    { label: "Checked-out", value: stats.checkedOut, icon: Flame, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { label: "Average Visitor Wait Time", value: "0", icon: Clock, tone: "text-primary-700 bg-primary-50/70 border-primary-100" },
  ];

  if (authLoading || portalLoading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">Loading visitor management…</div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary-100 bg-gradient-to-r from-white via-primary-50/50 to-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-primary-600" />
              {isAdmin && scopedBusinessName
                ? scopedBusinessName
                : industryFilter === "all"
                  ? "Visitor Management"
                  : industryLabel(industryFilter)}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Corporate-grade reception dashboard for check-ins, approvals, and live visitor flow.
              {usingMockData ? " Sample data until database setup is complete." : ""}
            </p>
          </div>
          {!isVisitorOnly ? (
            <Link
              href={pathWithOwner("/dashboard/visitor-management/employees", adminOwnerId)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              Employee attendance
            </Link>
          ) : null}
        </div>
      </section>

      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_PATH} className="mt-2" /> : null}

      {needsSelection ? <AdminSelectBusinessPrompt /> : null}
      {!needsSelection && (
        <>
      {setupRequired && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Run <code className="font-mono text-xs">database/visitor_management_patch_01.sql</code> in the
          Supabase SQL Editor to enable live visitor records.
        </p>
      )}
      {loadError && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      {loadingVisitors ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading visitors…</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${c.tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{c.label}</span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="mt-2 text-3xl font-extrabold">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search visitor name, host, phone or status..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRegisterGuestNotice(null);
                setRegisterGuestOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Register guest
            </button>
            <Link
              href={publicCheckInUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold ${
                publicCheckInUrl
                  ? "border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100"
                  : "pointer-events-none border-gray-200 bg-gray-100 text-gray-500"
              }`}
            >
              Open pre-registration form
            </Link>
          </div>
        </div>
      </div>

      {registerGuestNotice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {registerGuestNotice}
        </p>
      ) : null}

      {activityOwnerId && !usingMockData ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-primary-900">
                <Link2 className="h-4 w-4 shrink-0" />
                Public check-in link
              </p>
              <p className="mt-2 break-all font-mono text-xs text-gray-800 bg-white/80 rounded-lg border border-primary-100 px-3 py-2">
                {publicCheckInUrl || "…"}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!publicCheckInUrl) return;
                try {
                  await navigator.clipboard.writeText(publicCheckInUrl);
                  setCheckInLinkCopied(true);
                  window.setTimeout(() => setCheckInLinkCopied(false), 2000);
                } catch {
                  /* ignore */
                }
              }}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50"
            >
              <Copy className="h-4 w-4" />
              {checkInLinkCopied ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-primary-100 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-900">
              Industry pre-registration demo links
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VISITOR_INDUSTRIES.map((industry) => (
                <Link
                  key={industry.slug}
                  href={industryCheckInUrl(
                    industry.slug,
                    activityOwnerId,
                    typeof window !== "undefined" ? window.location.origin : undefined
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-50"
                >
                  {industry.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <RegisterGuestModal
        open={registerGuestOpen}
        onClose={() => setRegisterGuestOpen(false)}
        defaultIndustrySlug={registerIndustrySlug}
        onSubmit={handleRegisterGuest}
      />

      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-800">Visitors</span>
          </div>
          <span className="text-xs font-semibold text-gray-500">{filteredVisitors.length} item(s)</span>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Visit Date</th>
                <th className="px-4 py-3 font-semibold">Visitor Name</th>
                <th className="px-4 py-3 font-semibold">Visitor Pass ID</th>
                <th className="px-4 py-3 font-semibold">Host Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Check-in Time</th>
                <th className="px-4 py-3 font-semibold">Checkout Time</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">QR Code</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map((v, index) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-primary-50/20">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(v.visitDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {formatVisitorPassId(v, index)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate" title={v.host}>
                    {v.host}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.phoneNumber}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate" title={industryLabel(v.industrySlug)}>
                    {industryLabel(v.industrySlug)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={v.purposeOfVisit}>
                    {v.purposeOfVisit || "Visitor"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {v.actualCheckInAt
                      ? new Date(v.actualCheckInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {v.actualCheckOutAt
                        ? new Date(v.actualCheckOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                    {v.source === "demo_form" ? (
                      <span className="mt-0.5 block text-xs text-primary-700">Industry form</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusBadgeClass(v.status)}`}
                    >
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.qrCodeToken ? (
                      <button
                        type="button"
                        onClick={() => setQrPreview(v)}
                        className="inline-flex"
                        title="View QR pass"
                      >
                        <MockQrCode token={v.qrCodeToken} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.status === "pending" && (
                        <>
                          <ActionBtn label="Approve" onClick={() => setStatus(v.id, "approved")} tone="green" />
                          <ActionBtn label="Reject" onClick={() => setStatus(v.id, "rejected")} tone="red" />
                        </>
                      )}
                      {v.status === "approved" && (
                        <ActionBtn label="Check In" onClick={() => setStatus(v.id, "checked_in")} tone="blue" />
                      )}
                      {v.status === "checked_in" && (
                        <ActionBtn label="Check Out" onClick={() => setStatus(v.id, "checked_out")} tone="slate" />
                      )}
                      <ActionBtn label="Details" onClick={() => setDetailVisitor(v)} tone="gray" icon={Eye} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500">
                    No visitors match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-900">Incoming Visitors</p>
          <Link href={VISITOR_MANAGEMENT_PATH} className="text-xs font-semibold text-primary-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {incomingVisitors.length ? (
            incomingVisitors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setDetailVisitor(v)}
                className="inline-flex h-12 min-w-12 items-center justify-center rounded-full border border-primary-100 bg-primary-50 px-3 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                title={v.fullName}
              >
                {v.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No pending visitors right now.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setRegisterGuestNotice(null);
              setRegisterGuestOpen(true);
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-primary-300 bg-white text-primary-700 hover:bg-primary-50"
            title="Add visitor"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

        </>
      )}

      {detailVisitor && (
        <DetailModal visitor={detailVisitor} onClose={() => setDetailVisitor(null)} />
      )}

      {qrPreview?.qrCodeToken && (
        <QrModal
          visitor={qrPreview}
          onClose={() => setQrPreview(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  tone,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  tone: "green" | "red" | "blue" | "slate" | "gray";
  icon?: typeof Eye;
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
    red: "bg-red-50 text-red-800 hover:bg-red-100 border-red-200",
    blue: "bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200",
    slate: "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200",
    gray: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${tones[tone]}`}
    >
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {label}
    </button>
  );
}

function DetailModal({ visitor, onClose }: { visitor: VisitorRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">Visitor details</h3>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            ["Name", visitor.fullName],
            ["Phone", visitor.phoneNumber],
            ["ID / Passport", visitor.idPassportNumber || "—"],
            ["Vehicle", visitor.vehiclePlateNumber || "—"],
            ["Host", visitor.host],
            ["Purpose", visitor.purposeOfVisit],
            ["Scheduled visit", formatVisitDateTime(visitor.visitDate, visitor.visitTime)],
            ["Actual check-in / out", formatActualCheckDetail(visitor)],
            ["Status", statusLabel(visitor.status)],
            ["Industry", industryLabel(visitor.industrySlug)],
          ].map(([k, val]) => (
            <div key={k} className="flex gap-2">
              <dt className="font-medium text-gray-500 w-28 flex-shrink-0">{k}</dt>
              <dd className="text-gray-900">{val}</dd>
            </div>
          ))}
        </dl>
        {visitor.formExtra && Object.keys(visitor.formExtra).length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Form details</p>
            <dl className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {Object.entries(visitor.formExtra).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <dt className="font-medium text-gray-500 w-28 flex-shrink-0 capitalize">{key}</dt>
                  <dd className="text-gray-900 break-words">
                    {Array.isArray(val) ? val.join(", ") : String(val ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {visitor.qrCodeToken && (
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Visitor pass</p>
            <MockQrCode token={visitor.qrCodeToken} label={visitor.qrCodeToken} />
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-6 w-full btn-primary text-sm py-2">
          Close
        </button>
      </div>
    </div>
  );
}

function QrModal({ visitor, onClose }: { visitor: VisitorRecord; onClose: () => void }) {
  const token = visitor.qrCodeToken!;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900">{visitor.fullName}</h3>
        <p className="text-sm text-gray-500 mt-1">Approved visitor pass</p>
        <div className="mt-6 flex justify-center">
          <MockQrCode token={token} className="scale-125" label={token} />
        </div>
        <p className="mt-4 text-xs text-gray-400 font-mono break-all">{token}</p>
        <button type="button" onClick={onClose} className="mt-6 w-full btn-outline text-sm py-2">
          Close
        </button>
      </div>
    </div>
  );
}


