"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { Loader2, MapPin, Plus, RefreshCw } from "lucide-react";

import CrmSiteVisitRankings from "@/components/fusion-xpress/visitor-management/employees/CrmSiteVisitRankings";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  accountHasVisitorFeature,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";
import type { CrmProjectRecord, CrmSiteVisitRecord, CrmSiteVisitRankEntry } from "@/lib/employees/crm-site-types";
import { useOrganizationIndustry } from "@/lib/hooks/useOrganizationIndustry";
import { formatEmployeeTimestamp } from "@/lib/employees/utils";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function CrmSiteGpsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();
  const { isRealEstate, loading: industryLoading } = useOrganizationIndustry();

  const [from, setFrom] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [to, setTo] = useState(todayIso());
  const [projects, setProjects] = useState<CrmProjectRecord[]>([]);
  const [visits, setVisits] = useState<CrmSiteVisitRecord[]>([]);
  const [rankings, setRankings] = useState<CrmSiteVisitRankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [visitorSubscription, setVisitorSubscription] = useState<VisitorSubscriptionState | null>(
    null
  );
  const [addingProject, setAddingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    addressLine1: "",
    suburb: "",
    state: "",
  });

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadVisitorSubscription = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/visitor-management/subscription", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        subscription?: VisitorSubscriptionState;
      };
      if (res.ok && json.subscription) setVisitorSubscription(json.subscription);
    } catch {
      /* optional */
    }
  }, [getToken]);

  const canUseCrmSiteGps =
    accountHasVisitorFeature({
      isAdmin,
      isVisitorOnly,
      email: user?.email,
      plan: visitorSubscription?.plan ?? "trial",
      feature: "real_estate_crm",
      subscriptionActive: visitorSubscription?.isActive ?? false,
    }) || isAdmin;

  const loadData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const qs = new URLSearchParams({ from, to });
      const [projRes, visitsRes] = await Promise.all([
        fetch("/api/visitor-employees/crm-projects", { headers, cache: "no-store" }),
        fetch(`/api/visitor-employees/crm-site-visits?${qs}`, { headers, cache: "no-store" }),
      ]);
      const projJson = (await projRes.json().catch(() => ({}))) as {
        projects?: CrmProjectRecord[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };
      const visitsJson = (await visitsRes.json().catch(() => ({}))) as {
        visits?: CrmSiteVisitRecord[];
        rankings?: CrmSiteVisitRankEntry[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };

      if (!projRes.ok && projRes.status !== 403) {
        throw new Error(projJson.error ?? "Failed to load projects");
      }
      if (!visitsRes.ok && visitsRes.status !== 403) {
        throw new Error(visitsJson.error ?? "Failed to load visits");
      }

      if (projJson.setupRequired || visitsJson.setupRequired) {
        setSetupRequired(true);
        setLoadError(projJson.message ?? visitsJson.message ?? null);
        setProjects([]);
        setVisits([]);
        setRankings([]);
        return;
      }

      setSetupRequired(false);
      setProjects(projJson.projects ?? []);
      setVisits(visitsJson.visits ?? []);
      setRankings(visitsJson.rankings ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load CRM site GPS");
    } finally {
      setLoading(false);
    }
  }, [from, to, getToken]);

  useEffect(() => {
    if (authLoading || portalLoading || industryLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
      return;
    }
    if (!isRealEstate) {
      router.replace(VISITOR_MANAGEMENT_EMPLOYEES_PATH);
      return;
    }
    void loadVisitorSubscription();
    void loadData();
  }, [
    authLoading,
    portalLoading,
    industryLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    isRealEstate,
    router,
    user,
    loadData,
    loadVisitorSubscription,
  ]);

  useEffect(() => {
    if (authLoading || portalLoading || industryLoading || loading) return;
    if (!isRealEstate) return;
    if (visitorSubscription && !canUseCrmSiteGps) {
      setLoadError("CRM site GPS requires an Enterprise plan with Real Estate CRM.");
    }
  }, [
    authLoading,
    portalLoading,
    industryLoading,
    loading,
    isRealEstate,
    visitorSubscription,
    canUseCrmSiteGps,
  ]);

  useEffect(() => {
    if (!liveRefresh || to < todayIso()) return;
    const id = window.setInterval(() => void loadData(), 30_000);
    return () => window.clearInterval(id);
  }, [liveRefresh, to, loadData]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    setAddingProject(true);
    try {
      const res = await fetch("/api/visitor-employees/crm-projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectForm),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; project?: CrmProjectRecord };
      if (!res.ok) throw new Error(json.error ?? "Could not add project");
      setProjectForm({ name: "", addressLine1: "", suburb: "", state: "" });
      await loadData();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not add project");
    } finally {
      setAddingProject(false);
    }
  };

  if (authLoading || portalLoading || industryLoading || loading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading CRM site GPS…</p>;
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-emerald-600" />
          CRM site GPS
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          CRM team members sign in at each project site with live GPS when showing clients around.
          Sign out when they leave, then sign in again at the next site. Rankings count completed
          visits automatically for awards.
        </p>
        <p className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={VISITOR_MANAGEMENT_EMPLOYEES_PATH}
            className="font-semibold text-primary-700 hover:underline"
          >
            ← Employees
          </Link>
          {!isVisitorOnly ? (
            <Link href={VISITOR_MANAGEMENT_PATH} className="font-semibold text-gray-600 hover:underline">
              Visitors
            </Link>
          ) : null}
        </p>
      </div>

      {setupRequired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Database setup required</p>
          <p className="mt-1">
            Run{" "}
            <code className="font-mono text-xs">database/visitor_employees_patch_07_crm_site_gps.sql</code>{" "}
            in Supabase, then refresh.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        Issue each CRM member a <strong>site visit QR</strong> from the Employees page (CRM tab).
        They open it on their phone at each project to sign in and sign out with GPS — separate from
        workplace reception attendance.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-600 mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-600 mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-auto">
          <input
            type="checkbox"
            checked={liveRefresh}
            onChange={(e) => setLiveRefresh(e.target.checked)}
            className="rounded border-gray-300"
          />
          Live refresh (30s)
        </label>
      </div>

      <CrmSiteVisitRankings rankings={rankings} fromLabel={from} toLabel={to} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Project catalogue</h2>
            <p className="text-xs text-gray-500 mt-0.5">Optional list CRM can pick when signing in</p>
          </div>
          <form onSubmit={(e) => void handleAddProject(e)} className="p-4 border-b border-gray-100 space-y-2">
            <input
              type="text"
              required
              placeholder="Project name"
              value={projectForm.name}
              onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Address (for map pin)"
              value={projectForm.addressLine1}
              onChange={(e) => setProjectForm((f) => ({ ...f, addressLine1: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Suburb"
                value={projectForm.suburb}
                onChange={(e) => setProjectForm((f) => ({ ...f, suburb: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="County / state"
                value={projectForm.state}
                onChange={(e) => setProjectForm((f) => ({ ...f, state: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={addingProject || setupRequired}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {addingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add project
            </button>
          </form>
          {projects.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No projects yet — CRM can still type a site name on check-in.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {projects.map((p) => (
                <li key={p.id} className="px-4 py-2.5 text-sm">
                  <span className="font-semibold text-gray-900">{p.name}</span>
                  {p.suburb || p.state ? (
                    <span className="text-gray-500">
                      {" "}
                      — {[p.suburb, p.state].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                  {p.latitude != null ? (
                    <span className="block text-xs text-gray-400 font-mono mt-0.5">
                      {p.latitude.toFixed(5)}, {p.longitude?.toFixed(5)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Site visits</h2>
            <p className="text-xs text-gray-500 mt-0.5">GPS captured at sign-in and sign-out</p>
          </div>
          {visits.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">No site visits in this period.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {visits.map((v) => (
                <li key={v.id} className="px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-gray-900">{v.projectName}</span>
                    {!v.signOutAt ? (
                      <span className="text-xs font-semibold text-amber-700">On site</span>
                    ) : null}
                  </div>
                  <p className="text-gray-700">{v.employeeName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    In {formatEmployeeTimestamp(v.signInAt)}
                    {v.signOutAt ? ` · Out ${formatEmployeeTimestamp(v.signOutAt)}` : ""}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    In: {v.signInLatitude.toFixed(5)}, {v.signInLongitude.toFixed(5)}
                    {v.signOutLatitude != null
                      ? ` · Out: ${v.signOutLatitude.toFixed(5)}, ${v.signOutLongitude?.toFixed(5)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
