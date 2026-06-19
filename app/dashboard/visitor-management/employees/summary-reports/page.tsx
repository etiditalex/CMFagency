"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  BarChart3,
  Loader2,
  LogIn,
  LogOut,
  Printer,
  RefreshCw,
  Users,
} from "lucide-react";

import AttendanceReportLogTable from "@/components/fusion-xpress/visitor-management/employees/AttendanceReportLogTable";
import AttendanceSummaryCharts from "@/components/fusion-xpress/visitor-management/employees/AttendanceSummaryCharts";
import AttendanceSummaryRankingsPanel from "@/components/fusion-xpress/visitor-management/employees/AttendanceSummaryRankings";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import SummaryReportExcelButton from "@/components/fusion-xpress/visitor-management/employees/SummaryReportExcelButton";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import type { AttendanceSummaryPayload } from "@/lib/employees/attendance-summary";
import {
  downloadAttendanceRegisterExcel,
  downloadPerEmployeeSummaryExcel,
  downloadStaffRankingsExcel,
} from "@/lib/employees/summary-report-excel";
import {
  DEFAULT_REPORTING_SETTINGS,
  isMissingEmployeesTableMessage,
} from "@/lib/employees/db-mapper";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import type {
  EmployeeLeaveRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";
import { eatDayKey, eatTodayDayKey } from "@/lib/time/eat";
import { supabase } from "@/lib/supabase";
import { VISITOR_MANAGEMENT_EMPLOYEES_PATH } from "@/lib/visitors/industry-options";

type DurationPreset = "today" | "7d" | "30d" | "month" | "custom";

function todayIso(): string {
  return eatTodayDayKey();
}

function shiftEatDayKey(ymd: string, days: number): string {
  const anchor = new Date(`${ymd}T12:00:00+03:00`);
  anchor.setTime(anchor.getTime() + days * 86_400_000);
  return eatDayKey(anchor);
}

function presetRange(preset: DurationPreset): { from: string; to: string } {
  const to = todayIso();
  if (preset === "today") return { from: to, to };
  if (preset === "7d") return { from: shiftEatDayKey(to, -6), to };
  if (preset === "30d") return { from: shiftEatDayKey(to, -29), to };
  if (preset === "month") {
    const [y, m] = to.split("-");
    return { from: `${y}-${m}-01`, to };
  }
  return { from: shiftEatDayKey(to, -6), to };
}

const PRESET_BUTTONS: { id: DurationPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

type SummaryExportSection = "perEmployee" | "rankings" | "register";

export default function EmployeeSummaryReportsPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } = usePortal();
  const {
    needsSelection,
    appendOwnerQuery,
    ownerId,
    businessName: scopedBusinessName,
  } = useAdminBusinessScope();

  const [preset, setPreset] = useState<DurationPreset>("7d");
  const initialRange = presetRange("7d");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryPayload | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [reportingSettings, setReportingSettings] = useState<EmployeeReportingSettings>(
    DEFAULT_REPORTING_SETTINGS
  );
  const [exportingSection, setExportingSection] = useState<SummaryExportSection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaveRecords, setLeaveRecords] = useState<EmployeeLeaveRecord[]>([]);

  const rangeIncludesToday = to >= todayIso();

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (isAdmin && scopedBusinessName) {
      setOrganizationName(scopedBusinessName);
      return;
    }
    if (!user?.id) return;
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const name = String(meta?.business_name ?? meta?.businessName ?? "").trim();
      if (name) setOrganizationName(name);
    });
  }, [user?.id, isAdmin, scopedBusinessName]);

  const loadReportingSettings = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(appendOwnerQuery("/api/visitor-employees/reporting-settings"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        settings?: EmployeeReportingSettings;
      };
      if (res.ok && json.settings) setReportingSettings(json.settings);
    } catch {
      /* keep defaults */
    }
  }, [getToken, appendOwnerQuery]);

  const loadEmployees = useCallback(async () => {
    if (isAdmin && needsSelection) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(appendOwnerQuery("/api/visitor-employees"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        setupRequired?: boolean;
        error?: string;
      };
      if (json.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (res.ok && Array.isArray(json.employees)) {
        setEmployees(json.employees);
      }
    } catch {
      /* optional */
    }
  }, [getToken, isAdmin, needsSelection, appendOwnerQuery]);

  const loadSummary = useCallback(async () => {
    if (isAdmin && needsSelection) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const qs = new URLSearchParams({ from, to });
      if (employeeId) qs.set("employeeId", employeeId);
      const res = await fetch(appendOwnerQuery(`/api/visitor-employees/attendance-summary?${qs}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        summary?: AttendanceSummaryPayload;
        leave?: EmployeeLeaveRecord[];
        setupRequired?: boolean;
        error?: string;
      };
      if (json.setupRequired) {
        setSetupRequired(true);
        setSummary(null);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load summary");
      if (json.summary) setSummary(json.summary);
      setLeaveRecords(Array.isArray(json.leave) ? json.leave : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load report";
      if (isMissingEmployeesTableMessage(msg)) {
        setSetupRequired(true);
      } else {
        setLoadError(msg);
      }
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, employeeId, getToken, isAdmin, needsSelection, appendOwnerQuery]);

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
    if (isAdmin && needsSelection) return;
    void loadEmployees();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    isAdmin,
    needsSelection,
    router,
    user,
    loadEmployees,
  ]);

  useEffect(() => {
    if (setupRequired || needsSelection) return;
    void loadSummary();
    void loadReportingSettings();
  }, [setupRequired, needsSelection, loadSummary, loadReportingSettings]);

  useEffect(() => {
    if (!liveRefresh || !rangeIncludesToday || setupRequired || needsSelection) return;
    const id = window.setInterval(() => {
      void loadSummary();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [liveRefresh, rangeIncludesToday, setupRequired, needsSelection, loadSummary]);

  useEffect(() => {
    if (authLoading || portalLoading || !isAuthenticated || !isPortalMember || !hasFeature("visitor_management")) {
      return;
    }
    if (needsSelection) return;
    const effectiveOwnerId = (isAdmin ? ownerId : user?.id ?? "").trim();
    if (!effectiveOwnerId) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void loadEmployees();
        void loadSummary();
        void loadReportingSettings();
      }, 350);
    };

    const channel = supabase
      .channel(`summary-realtime-${effectiveOwnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employee_attendance",
          filter: `owner_id=eq.${effectiveOwnerId}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employee_leave",
          filter: `owner_id=eq.${effectiveOwnerId}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employees",
          filter: `owner_id=eq.${effectiveOwnerId}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employee_reporting_settings",
          filter: `owner_id=eq.${effectiveOwnerId}`,
        },
        queueRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    needsSelection,
    isAdmin,
    ownerId,
    user?.id,
    loadEmployees,
    loadSummary,
    loadReportingSettings,
  ]);

  const exportMeta = useMemo(
    () => ({
      organizationName,
      from: summary?.from ?? from,
      to: summary?.to ?? to,
    }),
    [organizationName, summary?.from, summary?.to, from, to]
  );

  const runExport = useCallback(
    async (section: SummaryExportSection, fn: () => Promise<void>) => {
      setExportingSection(section);
      try {
        await fn();
      } catch (e: unknown) {
        setNotice(e instanceof Error ? e.message : "Excel export failed");
      } finally {
        setExportingSection(null);
      }
    },
    []
  );

  const handleExportPerEmployeeSummary = useCallback(async () => {
    if (!summary) return;
    await runExport("perEmployee", () =>
      downloadPerEmployeeSummaryExcel(summary.employeeSummaries, exportMeta)
    );
  }, [summary, exportMeta, runExport]);

  const handleExportRankings = useCallback(async () => {
    if (!summary) return;
    await runExport("rankings", () => downloadStaffRankingsExcel(summary.rankings, exportMeta));
  }, [summary, exportMeta, runExport]);

  const handleExportRegister = useCallback(async () => {
    if (!summary) return;
    await runExport("register", () =>
      downloadAttendanceRegisterExcel(
        summary.events,
        employees,
        exportMeta,
        reportingSettings,
        leaveRecords
      )
    );
  }, [summary, employees, exportMeta, reportingSettings, leaveRecords, runExport]);

  const applyPreset = (id: DurationPreset) => {
    setPreset(id);
    if (id !== "custom") {
      const r = presetRange(id);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const rangeLabel = useMemo(() => {
    if (!summary) return `${from} – ${to}`;
    try {
      const a = format(new Date(summary.from), "d MMM yyyy");
      const b = format(new Date(summary.to), "d MMM yyyy");
      return a === b ? a : `${a} – ${b}`;
    } catch {
      return `${from} – ${to}`;
    }
  }, [summary, from, to]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading summary reports…</p>;
  }

  return (
    <div className="w-full space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #employee-summary-print,
          #employee-summary-print * {
            visibility: visible;
          }
          #employee-summary-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-600" />
          {isAdmin && scopedBusinessName ? `${scopedBusinessName} — Summary` : "Summary reports"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">Attendance and leave by date range. Times in EAT.</p>
        <p className="mt-2 text-sm">
          <Link
            href={VISITOR_MANAGEMENT_EMPLOYEES_PATH}
            className="font-semibold text-primary-700 hover:underline"
          >
            ← Employees
          </Link>
        </p>
      </div>

      {isAdmin ? <BusinessScopeBar basePath={`${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/summary-reports`} /> : null}
      {needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {!needsSelection && setupRequired ? <EmployeeSetupBanner /> : null}

      {!needsSelection && !setupRequired ? (
        <>
          <section className="no-print rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESET_BUTTONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => applyPreset(b.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                    preset === b.id
                      ? "border-primary-500 bg-primary-50 text-primary-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
              <label className="text-xs font-semibold text-gray-700">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                  className="mt-1 block w-full min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-700">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                  className="mt-1 block w-full min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-700 flex-1 min-w-[180px]">
                Employee (optional)
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    void loadSummary();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Apply
                </button>
                <button
                  type="button"
                  disabled={!summary}
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  Print summary
                </button>
              </div>
            </div>
            {rangeIncludesToday ? (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={liveRefresh}
                  onChange={(e) => setLiveRefresh(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Auto-refresh every minute (includes today)
              </label>
            ) : null}
          </section>

          {loadError ? (
            <p className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </p>
          ) : null}
          {notice ? (
            <p className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {notice}
            </p>
          ) : null}

          <div id="employee-summary-print" ref={printRef} className="space-y-6">
            <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {organizationName || "Employee attendance summary"}
              </h2>
              <p className="text-sm text-gray-700 mt-1">Period: {rangeLabel}</p>
              <p className="text-xs text-gray-500 mt-1">
                Generated {summary?.generatedAtDisplay ?? formatEmployeeEmailDateTime(new Date().toISOString())}
              </p>
              <p className="text-xs text-gray-500">All times in East Africa Time (EAT)</p>
            </div>

            {summary ? (
              <>
                <p className="no-print text-xs text-gray-500">
                  Generated {summary.generatedAtDisplay}
                  {rangeIncludesToday ? " · Refreshes every minute while viewing today" : ""}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
                  {[
                    {
                      label: "Sign ins",
                      value: summary.totals.signIns,
                      icon: LogIn,
                      tone: "bg-emerald-50 border-emerald-200 text-emerald-900",
                    },
                    {
                      label: "Sign outs",
                      value: summary.totals.signOuts,
                      icon: LogOut,
                      tone: "bg-sky-50 border-sky-200 text-sky-900",
                    },
                    {
                      label: "Staff with activity",
                      value: summary.totals.uniqueEmployees,
                      icon: Users,
                      tone: "bg-violet-50 border-violet-200 text-violet-900",
                    },
                    {
                      label: "Total events",
                      value: summary.totals.events,
                      icon: BarChart3,
                      tone: "bg-amber-50 border-amber-200 text-amber-900",
                    },
                  ].map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.label} className={`rounded-xl border p-4 ${c.tone}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                            {c.label}
                          </span>
                          <Icon className="w-4 h-4 opacity-70" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold">{c.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="print:hidden">
                  <AttendanceSummaryCharts
                    dailySeries={summary.dailySeries}
                    hourlySeries={summary.hourlySeries}
                    rangeLabel={rangeLabel}
                  />
                </div>

                {summary.totals.duplicatesOmitted > 0 ? (
                  <p className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <strong>{summary.totals.duplicatesOmitted}</strong> duplicate scan
                    {summary.totals.duplicatesOmitted === 1 ? "" : "s"} omitted from totals.
                    {reportingSettings.shiftEnabled
                      ? " Each person counts at most one sign-in and one sign-out per shift per day."
                      : " Each person counts at most one sign-in and one sign-out per day."}
                  </p>
                ) : null}

                <AttendanceSummaryRankingsPanel
                  rankings={summary.rankings}
                  exportingExcel={exportingSection === "rankings"}
                  onExportExcel={() => void handleExportRankings()}
                />

                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden print:break-inside-avoid">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Per-employee summary</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{rangeLabel}</p>
                    </div>
                    <SummaryReportExcelButton
                      disabled={!summary}
                      loading={exportingSection === "perEmployee"}
                      onClick={() => void handleExportPerEmployeeSummary()}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                          <th className="px-4 py-2 font-semibold">Name</th>
                          <th className="px-4 py-2 font-semibold">Team</th>
                          <th className="px-4 py-2 font-semibold">Department</th>
                          <th className="px-4 py-2 font-semibold text-center">Days</th>
                          <th className="px-4 py-2 font-semibold text-center">Leave (approved)</th>
                          <th className="px-4 py-2 font-semibold text-center">Sign ins</th>
                          <th className="px-4 py-2 font-semibold text-center">Sign outs</th>
                          <th className="px-4 py-2 font-semibold">First sign-in</th>
                          <th className="px-4 py-2 font-semibold">Last sign-out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.employeeSummaries.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                              No attendance or leave recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          summary.employeeSummaries.map((row) => (
                            <tr key={row.employeeId} className="border-b border-gray-100">
                              <td className="px-4 py-2 font-medium text-gray-900">{row.fullName}</td>
                              <td className="px-4 py-2 text-gray-600">
                                {memberTypeLabel(row.memberType as "staff" | "crm")}
                              </td>
                              <td className="px-4 py-2 text-gray-600">{row.department || "—"}</td>
                              <td className="px-4 py-2 text-center font-semibold text-gray-900">
                                {row.daysAttended}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold text-amber-800">
                                {row.leaveDays > 0 ? row.leaveDays : "—"}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold text-emerald-800">
                                {row.signInCount}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold text-sky-800">
                                {row.signOutCount}
                              </td>
                              <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                                {row.firstSignIn
                                  ? formatEmployeeEmailDateTime(row.firstSignIn)
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                                {row.lastSignOut
                                  ? formatEmployeeEmailDateTime(row.lastSignOut)
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="space-y-4 print:break-before-page">
                  <AttendanceReportLogTable
                    events={summary.events}
                    employees={employees}
                    reportingSettings={reportingSettings}
                    leaveRecords={leaveRecords}
                    from={from}
                    to={to}
                    title="Attendance register"
                    subtitle={`Approved leave and daily sign-in / sign-out · times in EAT`}
                    exportingExcel={exportingSection === "register"}
                    onExportExcel={() => void handleExportRegister()}
                    labelSignOutOvertime={reportingSettings.shiftEnabled}
                  />
                </div>

                <p className="hidden print:block text-xs text-gray-500 pt-4 border-t border-gray-200">
                  Totals: {summary.totals.signIns} sign-in · {summary.totals.signOuts} sign-out ·{" "}
                  {summary.totals.uniqueEmployees} staff with activity
                </p>
              </>
            ) : loading ? (
              <p className="text-sm text-gray-500 py-12 text-center flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading report…
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
