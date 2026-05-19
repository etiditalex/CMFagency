"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Download,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  ScanLine,
  Pencil,
  UserCog,
  Users,
  X,
} from "lucide-react";

import AddEmployeeModal from "@/components/fusion-xpress/visitor-management/employees/AddEmployeeModal";
import EditEmployeeTimesModal from "@/components/fusion-xpress/visitor-management/employees/EditEmployeeTimesModal";
import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import NotificationAdminsPanel from "@/components/fusion-xpress/visitor-management/employees/NotificationAdminsPanel";
import ReceptionQrPanel from "@/components/fusion-xpress/visitor-management/employees/ReceptionQrPanel";
import ReportingTimesPanel from "@/components/fusion-xpress/visitor-management/employees/ReportingTimesPanel";
import { downloadEmployeeAttendanceExcel } from "@/lib/employees/attendance-excel";
import { DEFAULT_REPORTING_SETTINGS, isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import {
  isRealEstateIndustry,
  memberTypeBadgeClass,
  memberTypeLabel,
} from "@/lib/employees/real-estate";
import {
  reportingWindowForMember,
  signInReportingStatus,
  signInStatusClass,
  signInStatusLabel,
  signOutReportingStatus,
  signOutStatusClass,
  signOutStatusLabel,
} from "@/lib/employees/reporting-time";
import { downloadEmployeeQrPdf } from "@/lib/employees/download-employee-qr-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import type {
  EmployeeAttendanceRecord,
  EmployeeFormInput,
  EmployeeMemberType,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";

const MEMBER_TYPES: EmployeeMemberType[] = ["staff", "crm"];
import {
  employeeAttendanceBadgeClass,
  employeeAttendanceLabel,
  employeeStats,
  employeeStatusBadgeClass,
  formatEmployeeTimestamp,
} from "@/lib/employees/utils";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH,
  VISITOR_MANAGEMENT_PATH,
  VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
} from "@/lib/visitors/industry-options";
import {
  accountHasVisitorFeature,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";

export default function VisitorManagementEmployeesPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [qrEmployee, setQrEmployee] = useState<EmployeeRecord | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [editTimesEmployee, setEditTimesEmployee] = useState<EmployeeRecord | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isRealEstate, setIsRealEstate] = useState(false);
  const [memberTab, setMemberTab] = useState<EmployeeMemberType>("staff");
  const [reportingSettings, setReportingSettings] = useState<EmployeeReportingSettings>(
    DEFAULT_REPORTING_SETTINGS
  );
  const [visitorSubscription, setVisitorSubscription] = useState<VisitorSubscriptionState | null>(
    null
  );

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSetupRequired(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");

      const [empRes, attRes] = await Promise.all([
        fetch("/api/visitor-employees", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/visitor-employees/attendance?limit=500", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const empJson = (await empRes.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };
      if (!empRes.ok) {
        const errMsg = empJson.error ?? "Failed to load employees";
        if (isMissingEmployeesTableMessage(errMsg) || empJson.setupRequired) {
          setSetupRequired(true);
          setEmployees([]);
          setLoadError(empJson.message ?? errMsg);
          return;
        }
        throw new Error(errMsg);
      }

      if (empJson.setupRequired) {
        setSetupRequired(true);
        setEmployees([]);
        setLoadError(empJson.message ?? null);
      } else {
        setEmployees(Array.isArray(empJson.employees) ? empJson.employees : []);
      }

      const attJson = (await attRes.json().catch(() => ({}))) as {
        attendance?: EmployeeAttendanceRecord[];
      };
      if (attRes.ok && Array.isArray(attJson.attendance)) {
        setAttendance(attJson.attendance);
      } else {
        setAttendance([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load employees";
      if (isMissingEmployeesTableMessage(msg)) {
        setSetupRequired(true);
        setLoadError(msg);
      } else {
        setLoadError(msg);
      }
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!user?.id) return;
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const name = String(meta?.business_name ?? meta?.businessName ?? "").trim();
      if (name) setOrganizationName(name);
      const industry = String(meta?.organization_industry ?? "").trim();
      setIsRealEstate(isRealEstateIndustry(industry));
    });
  }, [user?.id]);

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

  const canDownloadQr = useMemo(() => {
    if (!visitorSubscription && !user?.email) return false;
    return accountHasVisitorFeature({
      isAdmin,
      isVisitorOnly,
      email: user?.email,
      plan: visitorSubscription?.plan ?? "trial",
      feature: "employee_qr_download",
      subscriptionActive: visitorSubscription?.isActive ?? false,
    });
  }, [isAdmin, isVisitorOnly, user?.email, visitorSubscription]);

  const loadReportingSettings = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/visitor-employees/reporting-settings", {
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
  }, [getToken]);

  useEffect(() => {
    if (setupRequired) return;
    void loadReportingSettings();
  }, [setupRequired, loadReportingSettings]);

  const handleDownloadPdf = useCallback(
    async (emp: EmployeeRecord) => {
      if (!emp.qrCodeToken) return;
      if (!canDownloadQr) {
        setNotice(
          "QR PDF download is included on the Professional and Enterprise plans. Upgrade in Subscription settings."
        );
        return;
      }
      setDownloadingPdfId(emp.id);
      try {
        await downloadEmployeeQrPdf({
          token: emp.qrCodeToken,
          fullName: emp.fullName,
          department: emp.department,
          jobTitle: emp.jobTitle,
          employeeCode: emp.employeeCode,
          organizationName,
        });
      } catch (e: unknown) {
        setNotice(e instanceof Error ? e.message : "Could not create PDF");
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [canDownloadQr, organizationName]
  );

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
    loadEmployees();
    void loadVisitorSubscription();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    router,
    user,
    loadEmployees,
    loadVisitorSubscription,
  ]);

  const displayedEmployees = useMemo(() => {
    if (!isRealEstate) return employees;
    return employees.filter((e) => e.memberType === memberTab);
  }, [employees, isRealEstate, memberTab]);

  const stats = useMemo(
    () => employeeStats(isRealEstate ? displayedEmployees : employees),
    [employees, displayedEmployees, isRealEstate]
  );

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.fullName);
    return m;
  }, [employees]);

  const employeeById = useMemo(() => {
    const m = new Map<string, EmployeeRecord>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const handleAddEmployee = useCallback(
    async (payload: EmployeeFormInput) => {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitor-employees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        employee?: EmployeeRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to add employee");
      if (json.employee) {
        setEmployees((prev) =>
          [...prev, json.employee!].sort((a, b) => a.fullName.localeCompare(b.fullName))
        );
        const teamNote = isRealEstate
          ? ` (${memberTypeLabel(json.employee.memberType)} team)`
          : "";
        const idNote = json.employee.employeeCode
          ? ` Member ID: ${json.employee.employeeCode}.`
          : "";
        setNotice(
          `${json.employee.fullName}${teamNote} added.${idNote} They use this ID once at reception to link their phone.`
        );
        setQrEmployee(json.employee);
      }
      await loadEmployees();
    },
    [getToken, loadEmployees, isRealEstate]
  );

  const clearEmployeeDevice = useCallback(
    async (id: string, fullName: string) => {
      setPatchingId(id);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch(`/api/visitor-employees/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clearDeviceLink: true }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Reset failed");
        setNotice(`${fullName}'s phone link cleared. They can enter their member ID again at reception.`);
        await loadEmployees();
      } catch (e: unknown) {
        setNotice(e instanceof Error ? e.message : "Could not reset phone link");
      } finally {
        setPatchingId(null);
      }
    },
    [getToken, loadEmployees]
  );

  const setEmployeeMemberType = useCallback(
    async (id: string, memberType: EmployeeMemberType) => {
      setPatchingId(id);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch(`/api/visitor-employees/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ memberType }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          employee?: EmployeeRecord;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Update failed");
        if (json.employee) {
          setEmployees((prev) => prev.map((e) => (e.id === id ? json.employee! : e)));
          setNotice(`${json.employee.fullName} marked as ${memberTypeLabel(json.employee.memberType)}.`);
        }
      } catch (e: unknown) {
        setNotice(e instanceof Error ? e.message : "Could not update team");
      } finally {
        setPatchingId(null);
      }
    },
    [getToken]
  );

  const setEmployeeStatus = useCallback(
    async (id: string, status: "active" | "inactive") => {
      setPatchingId(id);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch(`/api/visitor-employees/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          employee?: EmployeeRecord;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Update failed");
        if (json.employee) {
          setEmployees((prev) => prev.map((e) => (e.id === id ? json.employee! : e)));
        }
      } finally {
        setPatchingId(null);
      }
    },
    [getToken]
  );

  const saveEmployeeTimes = useCallback(
    async (
      id: string,
      payload: {
        lastSignedInAt: string | null;
        lastSignedOutAt: string | null;
        attendanceStatus: "in" | "out";
      }
    ) => {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/visitor-employees/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        employee?: EmployeeRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to save times");
      if (json.employee) {
        setEmployees((prev) => prev.map((e) => (e.id === id ? json.employee! : e)));
      }
      await loadEmployees();
    },
    [getToken, loadEmployees]
  );

  const saveAttendanceTime = useCallback(
    async (attendanceId: string, createdAt: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/visitor-employees/attendance/${encodeURIComponent(attendanceId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ createdAt }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update event time");
      await loadEmployees();
    },
    [getToken, loadEmployees]
  );

  const handleExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      await downloadEmployeeAttendanceExcel({
        employees,
        attendance,
        employeeNameById,
        organizationName,
        isRealEstate,
        reportingSettings,
      });
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "Excel export failed");
    } finally {
      setExportingExcel(false);
    }
  }, [employees, attendance, employeeNameById, organizationName, isRealEstate, reportingSettings]);

  const statCards = [
    {
      label: isRealEstate ? `Total ${memberTypeLabel(memberTab)}` : "Total staff",
      value: stats.total,
      icon: Users,
      tone: "text-primary-700 bg-primary-50 border-primary-100",
    },
    {
      label: "Active",
      value: stats.active,
      icon: BadgeCheck,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Signed in now",
      value: stats.signedIn,
      icon: LogIn,
      tone: "text-sky-700 bg-sky-50 border-sky-100",
    },
    {
      label: "Signed out",
      value: stats.signedOut,
      icon: LogOut,
      tone: "text-slate-700 bg-slate-50 border-slate-200",
    },
  ];

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading employees…</p>;
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <UserCog className="w-7 h-7 text-primary-600" />
          Employee attendance
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Add staff manually, issue a unique QR pass per person, and record sign-in and sign-out.
          Organisation directors receive email when someone reports to work or leaves. Staff who
          sign in after your latest reporting time are marked <strong className="text-red-700">late</strong>.
          Configure windows below (default: report 7:00–8:00 AM, sign out from 5:00 PM).
          {isRealEstate ? (
            <>
              {" "}
              Real estate accounts can set separate times for <strong>staff</strong> and{" "}
              <strong>CRM</strong> teams.
            </>
          ) : null}
        </p>
        {!isVisitorOnly ? (
          <p className="mt-2 text-sm">
            <Link href={VISITOR_MANAGEMENT_PATH} className="font-semibold text-primary-700 hover:underline">
              ← Back to visitors
            </Link>
          </p>
        ) : null}
      </div>

      {setupRequired ? <EmployeeSetupBanner /> : null}
      {!setupRequired ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Workplace GPS sign-in is configured under{" "}
          <Link href={VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH} className="font-bold underline">
            Employees → GPS tracking
          </Link>
          . Set your reception pin there before staff scan the QR.
        </p>
      ) : null}
      {loadError && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl border p-4 ${c.tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {c.label}
                </span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="mt-2 text-2xl font-extrabold">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600">
          Mount the reception team QR at the desk. Scanning opens the sign-in page on a phone. Use the
          kiosk scanner for individual passes if needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50"
          >
            <ScanLine className="w-4 h-4" />
            Open kiosk scanner
          </Link>
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setAddOpen(true);
            }}
            disabled={setupRequired}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add employee
          </button>
        </div>
      </div>

      {!canDownloadQr && !setupRequired ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Downloading employee and reception QR PDFs requires a{" "}
          <strong>Professional</strong> or <strong>Enterprise</strong> subscription.{" "}
          <Link href={VISITOR_MANAGEMENT_SUBSCRIPTION_PATH} className="font-semibold underline">
            Upgrade plan
          </Link>
        </p>
      ) : null}

      <ReceptionQrPanel
        disabled={setupRequired}
        isRealEstate={isRealEstate}
        organizationName={organizationName}
        canDownloadQr={canDownloadQr}
      />

      <NotificationAdminsPanel disabled={setupRequired} />

      {!setupRequired ? (
        <ReportingTimesPanel disabled={setupRequired} isRealEstate={isRealEstate} />
      ) : null}

      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddEmployee}
        showMemberType={isRealEstate}
        defaultMemberType={isRealEstate ? memberTab : "staff"}
        title={isRealEstate ? "Add employee" : "Add staff member"}
      />

      <EditEmployeeTimesModal
        employee={editTimesEmployee}
        onClose={() => setEditTimesEmployee(null)}
        onSave={saveEmployeeTimes}
      />

      {qrEmployee?.qrCodeToken ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-gray-200 text-center">
            <button
              type="button"
              onClick={() => setQrEmployee(null)}
              className="absolute top-4 right-4 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-sm font-bold text-gray-900 mb-4">QR pass — {qrEmployee.fullName}</p>
            <EmployeeQrCode token={qrEmployee.qrCodeToken} employeeName={qrEmployee.fullName} size={200} />
            <p className="mt-4 text-xs text-gray-500">
              {canDownloadQr
                ? "Download the PDF for printing. Each scan records sign-in/out time and emails directors."
                : "View on screen during trial. Upgrade to Professional to download QR PDFs for printing."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {canDownloadQr ? (
                <button
                  type="button"
                  disabled={downloadingPdfId === qrEmployee.id}
                  onClick={() => void handleDownloadPdf(qrEmployee)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-primary-50 py-2.5 text-sm font-bold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {downloadingPdfId === qrEmployee.id ? "Creating PDF…" : "Download QR PDF"}
                </button>
              ) : (
                <Link
                  href={VISITOR_MANAGEMENT_SUBSCRIPTION_PATH}
                  className="w-full inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100"
                >
                  Upgrade to download QR PDF
                </Link>
              )}
              <button
                type="button"
                onClick={() => setQrEmployee(null)}
                className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Users className="w-4 h-4 text-gray-500" />
            {isRealEstate ? `${memberTypeLabel(memberTab)} team` : "Staff members"}
          </span>
          {isRealEstate ? (
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold">
              {(["staff", "crm"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMemberTab(tab)}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    memberTab === tab
                      ? "bg-primary-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {memberTypeLabel(tab)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500 text-center">Loading…</p>
        ) : displayedEmployees.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">
            {isRealEstate
              ? `No ${memberTypeLabel(memberTab).toLowerCase()} members yet. Add someone to this team to generate QR passes.`
              : "No employees yet. Add your first staff member to generate QR passes."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Member ID</th>
                  {isRealEstate ? (
                    <th className="px-4 py-3 font-semibold">Team</th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Last sign-in</th>
                  {isRealEstate ? (
                    <th className="px-4 py-3 font-semibold">Reporting</th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                      {emp.employeeCode || "—"}
                    </td>
                    {isRealEstate ? (
                      <td className="px-4 py-3">
                        <select
                          value={emp.memberType}
                          disabled={setupRequired || patchingId === emp.id}
                          onChange={(e) => {
                            const next = e.target.value as EmployeeMemberType;
                            if (next === emp.memberType) return;
                            void setEmployeeMemberType(emp.id, next);
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50 ${memberTypeBadgeClass(emp.memberType)}`}
                          aria-label={`Team for ${emp.fullName}`}
                        >
                          {MEMBER_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {memberTypeLabel(t)}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-gray-600">
                      {emp.department || "—"}
                      {emp.jobTitle ? (
                        <span className="block text-xs text-gray-400">{emp.jobTitle}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${employeeAttendanceBadgeClass(emp.attendanceStatus)}`}
                      >
                        {employeeAttendanceLabel(emp.attendanceStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatEmployeeTimestamp(emp.lastSignedInAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${signInStatusClass(
                          signInReportingStatus(
                            emp.lastSignedInAt,
                            reportingWindowForMember(reportingSettings, emp.memberType)
                          )
                        )}`}
                      >
                        {signInStatusLabel(
                          signInReportingStatus(
                            emp.lastSignedInAt,
                            reportingWindowForMember(reportingSettings, emp.memberType)
                          )
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${employeeStatusBadgeClass(emp.status)}`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {emp.qrCodeToken ? (
                          <button
                            type="button"
                            onClick={() => setQrEmployee(emp)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            QR
                          </button>
                        ) : null}
                        {emp.qrCodeToken && canDownloadQr ? (
                          <button
                            type="button"
                            disabled={downloadingPdfId === emp.id || setupRequired}
                            onClick={() => void handleDownloadPdf(emp)}
                            className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={setupRequired}
                          onClick={() => setEditTimesEmployee(emp)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Times
                        </button>
                        {emp.registeredDeviceId ? (
                          <button
                            type="button"
                            disabled={patchingId === emp.id || setupRequired}
                            onClick={() => void clearEmployeeDevice(emp.id, emp.fullName)}
                            className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
                          >
                            Reset phone
                          </button>
                        ) : null}
                        {emp.status === "active" ? (
                          <button
                            type="button"
                            disabled={patchingId === emp.id}
                            onClick={() => setEmployeeStatus(emp.id, "inactive")}
                            className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={patchingId === emp.id}
                            onClick={() => setEmployeeStatus(emp.id, "active")}
                            className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Clock className="w-4 h-4 text-gray-500" />
            Attendance log
          </span>
          <button
            type="button"
            disabled={setupRequired || exportingExcel || employees.length === 0}
            onClick={() => void handleExportExcel()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exportingExcel ? "Exporting…" : "Download Excel"}
          </button>
        </div>
        {attendance.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No attendance events yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {attendance.map((row) => {
              const emp = employeeById.get(row.employeeId);
              const memberWindow = emp
                ? reportingWindowForMember(reportingSettings, emp.memberType)
                : null;
              const signInStatus =
                row.eventType === "sign_in" && memberWindow
                  ? signInReportingStatus(row.createdAt, memberWindow)
                  : null;
              const signOutStatus =
                row.eventType === "sign_out" && memberWindow
                  ? signOutReportingStatus(row.createdAt, memberWindow.signOut)
                  : null;
              return (
              <li key={row.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                  {employeeNameById.get(row.employeeId) ?? "Staff"}
                  {isRealEstate && emp ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${memberTypeBadgeClass(emp.memberType)}`}
                    >
                      {memberTypeLabel(emp.memberType)}
                    </span>
                  ) : null}
                  {signInStatus && signInStatus !== "unknown" ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${signInStatusClass(signInStatus)}`}
                    >
                      {signInStatusLabel(signInStatus)}
                    </span>
                  ) : null}
                  {signOutStatus && signOutStatus !== "unknown" ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${signOutStatusClass(signOutStatus)}`}
                    >
                      {signOutStatusLabel(signOutStatus)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={
                    row.eventType === "sign_in"
                      ? signInStatus === "late"
                        ? "text-red-700 font-semibold"
                        : "text-emerald-700 font-semibold"
                      : "text-slate-600 font-semibold"
                  }
                >
                  {row.eventType === "sign_in" ? "Signed in" : "Signed out"}
                </span>
                <span className="text-gray-500 text-xs flex flex-wrap items-center gap-2">
                  {formatEmployeeTimestamp(row.createdAt)}
                  {row.deviceLabel ? ` · ${row.deviceLabel}` : ""}
                  {!setupRequired ? (
                    <button
                      type="button"
                      className="font-semibold text-primary-700 hover:underline"
                      onClick={async () => {
                        const d = new Date(row.createdAt);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        const defaultLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        const raw = window.prompt("Edit event date & time", defaultLocal);
                        if (!raw) return;
                        try {
                          await saveAttendanceTime(row.id, new Date(raw).toISOString());
                        } catch (e: unknown) {
                          setNotice(e instanceof Error ? e.message : "Could not update time");
                        }
                      }}
                    >
                      Edit time
                    </button>
                  ) : null}
                </span>
              </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
