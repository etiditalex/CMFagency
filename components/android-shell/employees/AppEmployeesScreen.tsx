"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, RefreshCw, Users } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import AddEmployeeModal from "@/components/fusion-xpress/visitor-management/employees/AddEmployeeModal";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import SearchField from "@/components/fusion-xpress/app-ui/SearchField";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { ANDROID_SHELL_EMPLOYEES_PATH, visitorSignInHref } from "@/lib/android-shell";
import { employeeAttendanceLabel, employeeStats } from "@/lib/employees/utils";
import { useVisitorEmployees } from "@/lib/hooks/useVisitorEmployees";

export default function AppEmployeesScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasFeature, isAdmin, isPortalMember, loading: portalLoading } = usePortal();
  const {
    employees,
    loading,
    error,
    setupRequired,
    needsSelection,
    reload,
    addEmployee,
  } = useVisitorEmployees();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const canAccess =
    isAuthenticated && isPortalMember && (isAdmin || hasFeature("visitor_management"));

  const stats = useMemo(() => employeeStats(employees), [employees]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.fullName, e.jobTitle, e.department, e.employeeCode ?? "", e.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, query]);

  if (authLoading || portalLoading) {
    return (
      <AndroidShellFrame nav>
        <TopBar title="Employees" />
        <p className="px-5 pt-8 text-center text-[13px] text-fx-muted">Loading…</p>
      </AndroidShellFrame>
    );
  }

  if (!isAuthenticated || !isPortalMember) {
    return (
      <AndroidShellFrame nav>
        <TopBar title="Employees" />
        <div className="px-5 pt-6">
          <FxCard>
            <Users className="h-8 w-8 text-fx-accent" />
            <h2 className="mt-3 text-[18px] font-bold text-fx-ink">Sign in to view staff</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-fx-muted">
              Roster, attendance, leave, and QR codes stay in this app. They use the same live
              Employee APIs as Fusion Xpress.
            </p>
            <Link
              href={visitorSignInHref(ANDROID_SHELL_EMPLOYEES_PATH)}
              className="mt-5 flex min-h-[48px] items-center justify-center rounded-full bg-fx-accent text-[14px] font-bold text-white"
            >
              Sign in
            </Link>
          </FxCard>
        </div>
      </AndroidShellFrame>
    );
  }

  if (!canAccess) {
    return (
      <AndroidShellFrame nav>
        <TopBar title="Employees" />
        <p className="px-5 pt-8 text-center text-[13px] text-fx-muted">
          This account does not include Employee access.
        </p>
      </AndroidShellFrame>
    );
  }

  return (
    <AndroidShellFrame nav>
      <TopBar
        title="Employees"
        subtitle={`${stats.active} active · ${stats.signedIn} signed in`}
        right={
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-fx-ink"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <SearchField value={query} onChange={setQuery} placeholder="Search employees..." />

        {needsSelection ? (
          <p className="mt-6 text-center text-[13px] text-fx-muted">
            Select a business in the admin dashboard first, then return here.
          </p>
        ) : null}

        {error ? <p className="mt-4 text-[13px] text-red-500">{error}</p> : null}
        {setupRequired ? (
          <p className="mt-4 text-[13px] text-fx-muted">Employee tables are not set up yet.</p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Total", stats.total],
            ["In", stats.signedIn],
            ["Out", stats.signedOut],
          ].map(([label, value]) => (
            <FxCard key={String(label)} className="text-center">
              <p className="text-[20px] font-bold text-fx-ink">{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-fx-muted">{label}</p>
            </FxCard>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {rows.map((employee) => (
            <li key={employee.id}>
              <Link href={`${ANDROID_SHELL_EMPLOYEES_PATH}/${employee.id}`}>
                <FxCard padded={false} className="flex items-center gap-3 p-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fx-accentSoft text-[13px] font-bold text-fx-accent">
                    {employee.fullName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-fx-ink">
                      {employee.fullName}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-fx-muted">
                      {employee.jobTitle || employee.department || employee.employeeCode || "Staff"}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      employee.attendanceStatus === "in"
                        ? "bg-fx-successBg text-fx-success"
                        : "bg-[#EEEAF6] text-fx-muted"
                    }`}
                  >
                    {employeeAttendanceLabel(employee.attendanceStatus)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-fx-inactive" />
                </FxCard>
              </Link>
            </li>
          ))}
        </ul>
        {!loading && rows.length === 0 && !setupRequired && !needsSelection ? (
          <p className="mt-8 text-center text-[13px] text-fx-muted">No employees yet.</p>
        ) : null}
      </div>

      {!needsSelection && !setupRequired ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="absolute bottom-[4.85rem] right-5 flex h-14 w-14 items-center justify-center rounded-full bg-fx-accent text-white shadow-[0_8px_20px_rgba(123,47,247,0.35)]"
          aria-label="Add employee"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      ) : null}

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={addEmployee} />
    </AndroidShellFrame>
  );
}
