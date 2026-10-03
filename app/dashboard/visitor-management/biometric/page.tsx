"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";

import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { BIOMETRIC_SETUP_MESSAGE } from "@/lib/employees/biometric-shared";
import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import type { EmployeeRecord } from "@/lib/employees/types";
import { employeeBiometricPayload, employeeBiometricStationPayload } from "@/lib/employees/utils";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { VISITOR_MANAGEMENT_BIOMETRIC_PATH, VISITOR_MANAGEMENT_EMPLOYEES_PATH } from "@/lib/visitors/industry-options";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";
import { supabase } from "@/lib/supabase";

type CredentialSummary = {
  employee_id: string;
  attachment: "platform" | "cross-platform";
  created_at: string;
  last_used_at: string | null;
  device_label: string | null;
};

export default function BiometricRecognitionPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();
  const { isAdmin, needsSelection, appendOwnerQuery, ownerId } = useAdminBusinessScope();

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [stationToken, setStationToken] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [biometricSetup, setBiometricSetup] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (needsSelection) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch(appendOwnerQuery("/api/visitor-employees/biometric"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        credentials?: CredentialSummary[];
        stationToken?: string;
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        const errMsg = json.error ?? "Could not load biometric recognition";
        if (isMissingEmployeesTableMessage(errMsg) || json.setupRequired) {
          setSetupRequired(true);
          setBiometricSetup(errMsg.includes("patch_19") || Boolean(json.message?.includes("patch_19")));
          setLoadError(json.message ?? errMsg);
          return;
        }
        throw new Error(errMsg);
      }
      setEmployees(json.employees ?? []);
      setCredentials(json.credentials ?? []);
      setStationToken(json.stationToken ?? "");
      setSetupRequired(Boolean(json.setupRequired));
      setBiometricSetup(Boolean(json.setupRequired && json.message?.includes("patch_19")));
      if (json.setupRequired) setLoadError(json.message ?? BIOMETRIC_SETUP_MESSAGE);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load biometric recognition");
    } finally {
      setLoading(false);
    }
  }, [appendOwnerQuery, needsSelection]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember || !hasFeature("visitor_management")) return;
    void load();
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature, load]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice(value);
    }
  };

  const resetThumb = async (employee: EmployeeRecord) => {
    if (!window.confirm(`Remove the recorded right thumb for ${employee.fullName}? They will record it again on next scan.`)) {
      return;
    }
    setBusyId(employee.id);
    setNotice(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch(appendOwnerQuery("/api/visitor-employees/biometric"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not reset the fingerprint.");
      setNotice(`Right thumb removed for ${employee.fullName}.`);
      await load();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not reset the fingerprint.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading biometric recognition…
      </p>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const stationUrl = stationToken ? employeeBiometricStationPayload(stationToken, origin) : "";

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="flex items-center gap-2 border-b border-hairline pb-3 text-2xl font-bold text-[#1a2332]">
          <Fingerprint className="h-7 w-7 text-primary-700" />
          Biometric recognition
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Staff sign in and out with a right thumb. Phones use the fingerprint already in the operating system.
          A fingerprint reader at reception uses the station link. Attendance follows the same workplace,
          sign-in, and sign-out rules as QR scanning.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href={pathWithOwner(VISITOR_MANAGEMENT_EMPLOYEES_PATH, isAdmin ? ownerId : null)}
            className="font-semibold text-primary-700 hover:underline"
          >
            ← Employees
          </Link>
        </p>
      </div>

      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_BIOMETRIC_PATH} /> : null}
      {needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {!needsSelection && setupRequired && !biometricSetup ? <EmployeeSetupBanner /> : null}
      {!needsSelection && biometricSetup ? (
        <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-bold">Database setup required</p>
          <p>{BIOMETRIC_SETUP_MESSAGE}</p>
        </section>
      ) : null}
      {loadError && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>
      ) : null}

      {!needsSelection && !setupRequired ? (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-gray-900">Reception fingerprint reader</h2>
            <p className="text-sm text-gray-600">
              Leave this page open on the computer with the reader attached. Each person scans their right thumb.
              The reader must already have that thumb recorded from the employee&apos;s personal link.
            </p>
            {stationUrl ? (
              <button
                type="button"
                onClick={() => void copy(stationUrl, "Station link")}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Copy station link
              </button>
            ) : null}
          </section>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Phone fingerprint</th>
                  <th className="px-4 py-3 font-semibold">Reader</th>
                  <th className="px-4 py-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-gray-500">
                      Add employees first, then share each biometric link.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const rows = credentials.filter((row) => row.employee_id === employee.id);
                    const phone = rows.some((row) => row.attachment === "platform");
                    const reader = rows.some((row) => row.attachment === "cross-platform");
                    const link = employee.qrCodeToken
                      ? employeeBiometricPayload(employee.qrCodeToken, origin)
                      : "";
                    return (
                      <tr key={employee.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{employee.fullName}</p>
                          <p className="text-xs text-gray-500">
                            {[employee.department, employee.employeeCode].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">{phone ? "Right thumb recorded" : "Not recorded"}</td>
                        <td className="px-4 py-3">{reader ? "Right thumb recorded" : "Not recorded"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!link}
                              onClick={() => void copy(link, "Biometric link")}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 disabled:opacity-40"
                            >
                              Copy link
                            </button>
                            <button
                              type="button"
                              disabled={busyId === employee.id || (!phone && !reader)}
                              onClick={() => void resetThumb(employee)}
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40"
                            >
                              Reset thumb
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
