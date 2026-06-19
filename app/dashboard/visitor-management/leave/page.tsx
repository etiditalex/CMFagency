"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import EmployeeLeavePanel from "@/components/fusion-xpress/visitor-management/employees/EmployeeLeavePanel";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import type { EmployeeRecord } from "@/lib/employees/types";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_LEAVE_PATH,
  VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";

export default function VisitorManagementLeavePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();
  const { needsSelection, appendOwnerQuery, ownerId } = useAdminBusinessScope();

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadEmployees = useCallback(async (options?: { silent?: boolean }) => {
    if (isAdmin && needsSelection) {
      setEmployees([]);
      if (!options?.silent) setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    setLoadError(null);
    setSetupRequired(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch(appendOwnerQuery("/api/visitor-employees"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        const errMsg = json.error ?? "Failed to load employees";
        if (isMissingEmployeesTableMessage(errMsg) || json.setupRequired) {
          setSetupRequired(true);
          setEmployees([]);
          setLoadError(json.message ?? errMsg);
          return;
        }
        throw new Error(errMsg);
      }

      if (json.setupRequired) {
        setSetupRequired(true);
        setEmployees([]);
        setLoadError(json.message ?? null);
      } else {
        setEmployees(Array.isArray(json.employees) ? json.employees : []);
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
      if (!options?.silent) setLoading(false);
    }
  }, [appendOwnerQuery, getToken, isAdmin, needsSelection]);

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
    if (!isVisitorOnly && !isAdmin) {
      router.replace(VISITOR_MANAGEMENT_EMPLOYEES_PATH);
      return;
    }
    void loadEmployees();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    isVisitorOnly,
    isAdmin,
    router,
    user,
    loadEmployees,
  ]);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-primary-600">
        <p className="text-sm font-semibold text-white">Loading leave management…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_PATH} /> : null}
      {isAdmin && needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {setupRequired ? (
        <EmployeeSetupBanner />
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      {!needsSelection ? (
        <div className="w-full overflow-hidden rounded-lg border border-primary-800/30 shadow-[0_8px_32px_rgba(15,23,42,0.18)]">
          <header className="relative flex items-center bg-primary-900 px-4 py-3 sm:px-6">
            <div className="relative z-10 flex shrink-0 items-center">
              <Image
                src={BRAND_LOGO_URL}
                alt="CMF Agency"
                width={120}
                height={40}
                className="h-9 w-auto object-contain brightness-0 invert sm:h-10"
                priority
              />
            </div>
            <h1 className="pointer-events-none absolute inset-x-0 text-center text-lg font-extrabold tracking-wide text-white sm:text-xl">
              Leave Management System
            </h1>
          </header>

          <div className="bg-primary-600 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <p className="mb-4 text-sm text-white/90">
              <Link
                href={VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Leave day settings
              </Link>
              {" · "}
              Configure annual leave balances per employee.
            </p>
            <EmployeeLeavePanel
              employees={employees}
              disabled={setupRequired}
              buildApiUrl={appendOwnerQuery}
              onLeaveChanged={() => void loadEmployees({ silent: true })}
              realtimeOwnerId={(isAdmin ? ownerId : user?.id ?? "").trim()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
