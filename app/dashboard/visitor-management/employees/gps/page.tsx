"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import WorkplaceLocationPanel from "@/components/fusion-xpress/visitor-management/employees/WorkplaceLocationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";
import { supabase } from "@/lib/supabase";

export default function VisitorManagementEmployeesGpsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly } = usePortal();

  const [setupRequired, setSetupRequired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const name = String(meta?.business_name ?? meta?.businessName ?? "").trim();
      if (name) setOrganizationName(name);
    });
  }, [user?.id]);

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
        const res = await fetch("/api/visitor-employees", {
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
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  if (authLoading || portalLoading || checkingSetup) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading GPS tracking…</p>;
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-sky-600" />
          GPS tracking
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Set your workplace pin and geofence radius. Staff and CRM must be within this area to sign
          in or out using the reception QR.
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

      {setupRequired ? <EmployeeSetupBanner /> : null}
      {loadError && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}
      {!setupRequired ? <WorkplaceLocationPanel businessName={organizationName} /> : null}
    </div>
  );
}
