"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fingerprint } from "lucide-react";

import BiometricFingerprintPanel from "@/components/fusion-xpress/visitor-management/employees/BiometricFingerprintPanel";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";
import { supabase } from "@/lib/supabase";

export default function VisitorManagementEmployeesBiometricPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminOwnerId = searchParams?.get("owner") ?? null;
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();

  const [setupRequired, setSetupRequired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

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

    void (async () => {
      setCheckingSetup(true);
      setLoadError(null);
      setSetupRequired(false);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Not signed in");
        const qs =
          isAdmin && adminOwnerId ? `?owner=${encodeURIComponent(adminOwnerId)}` : "";
        const res = await fetch(`/api/visitor-employees${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          setupRequired?: boolean;
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          const errMsg = json.error ?? "Failed to load employee module";
          if (isMissingEmployeesTableMessage(errMsg) || json.setupRequired) {
            setSetupRequired(true);
            setLoadError(json.message ?? errMsg);
            return;
          }
          throw new Error(errMsg);
        }
        if (json.setupRequired) {
          setSetupRequired(true);
          setLoadError(json.message ?? null);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load employee module";
        if (isMissingEmployeesTableMessage(msg)) {
          setSetupRequired(true);
          setLoadError(msg);
        } else {
          setLoadError(msg);
        }
      } finally {
        setCheckingSetup(false);
      }
    })();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    router,
    user,
    isAdmin,
    adminOwnerId,
  ]);

  if (authLoading || portalLoading || checkingSetup) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        Loading biometric fingerprint…
      </p>
    );
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Fingerprint className="w-7 h-7 text-sky-700" />
          Biometric fingerprint
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enroll each employee’s right thumb on the reception kiosk. Staff check in by searching
          their member ID or name, then confirming with fingerprint — alongside QR and member-code
          attendance.
        </p>
        <p className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={pathWithOwner(VISITOR_MANAGEMENT_EMPLOYEES_PATH, adminOwnerId)}
            className="font-semibold text-primary-700 hover:underline"
          >
            ← Employees
          </Link>
          {!isVisitorOnly ? (
            <Link
              href={VISITOR_MANAGEMENT_PATH}
              className="font-semibold text-gray-600 hover:underline"
            >
              Visitors
            </Link>
          ) : null}
        </p>
      </div>

      {setupRequired ? <EmployeeSetupBanner /> : null}
      {loadError && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}
      {!setupRequired ? (
        <BiometricFingerprintPanel adminOwnerId={isAdmin ? adminOwnerId : null} />
      ) : null}
    </div>
  );
}
