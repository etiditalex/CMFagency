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
  UserCog,
  Users,
  X,
} from "lucide-react";

import AddEmployeeModal from "@/components/fusion-xpress/visitor-management/employees/AddEmployeeModal";
import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import { downloadEmployeeQrPdf } from "@/lib/employees/download-employee-qr-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import type { EmployeeAttendanceRecord, EmployeeFormInput, EmployeeRecord } from "@/lib/employees/types";
import {
  employeeAttendanceBadgeClass,
  employeeAttendanceLabel,
  employeeStats,
  employeeStatusBadgeClass,
  formatEmployeeTimestamp,
} from "@/lib/employees/utils";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";

export default function VisitorManagementEmployeesPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly } = usePortal();

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
  const [notice, setNotice] = useState<string | null>(null);

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
        fetch("/api/visitor-employees/attendance?limit=30", {
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
    });
  }, [user?.id]);

  const handleDownloadPdf = useCallback(
    async (emp: EmployeeRecord) => {
      if (!emp.qrCodeToken) return;
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
    [organizationName]
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
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    router,
    user,
    loadEmployees,
  ]);

  const stats = useMemo(() => employeeStats(employees), [employees]);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.fullName);
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
        setNotice(`${json.employee.fullName} added. Share their QR pass for sign-in/out.`);
        setQrEmployee(json.employee);
      }
      await loadEmployees();
    },
    [getToken, loadEmployees]
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

  const statCards = [
    {
      label: "Total staff",
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
          Organisation directors receive email when someone reports to work or leaves.
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
          Use the reception kiosk to scan staff QR codes, or let employees scan their pass on their
          phone.
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

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAddEmployee} />

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
              Download the PDF for printing. Each scan records sign-in/out time and emails directors.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={downloadingPdfId === qrEmployee.id}
                onClick={() => void handleDownloadPdf(qrEmployee)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-primary-50 py-2.5 text-sm font-bold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloadingPdfId === qrEmployee.id ? "Creating PDF…" : "Download QR PDF"}
              </button>
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
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-800">Staff members</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500 text-center">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">
            No employees yet. Add your first staff member to generate QR passes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Last sign-in</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.fullName}</td>
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
                        {emp.qrCodeToken ? (
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
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-800">Recent sign-in / sign-out</span>
        </div>
        {attendance.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No attendance events yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {attendance.map((row) => (
              <li key={row.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-gray-900">
                  {employeeNameById.get(row.employeeId) ?? "Staff"}
                </span>
                <span
                  className={
                    row.eventType === "sign_in" ? "text-emerald-700 font-semibold" : "text-slate-600 font-semibold"
                  }
                >
                  {row.eventType === "sign_in" ? "Signed in" : "Signed out"}
                </span>
                <span className="text-gray-500 text-xs">
                  {formatEmployeeTimestamp(row.createdAt)}
                  {row.deviceLabel ? ` · ${row.deviceLabel}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-500 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <strong>Director notifications:</strong> emails go to your account owner address. Add extra
        director addresses in account metadata as{" "}
        <code className="font-mono">director_emails</code> (comma-separated) to notify supervisors.
      </p>
    </div>
  );
}
