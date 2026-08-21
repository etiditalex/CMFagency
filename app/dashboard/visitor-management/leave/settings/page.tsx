"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import LeaveAllocationSettingsPanel from "@/components/fusion-xpress/visitor-management/employees/LeaveAllocationSettingsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_LEAVE_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";

export default function VisitorManagementLeaveSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();
  const { needsSelection, appendOwnerQuery } = useAdminBusinessScope();
  const [setupRequired, setSetupRequired] = useState(false);

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
      router.replace(VISITOR_MANAGEMENT_LEAVE_PATH);
      return;
    }
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
  ]);

  const checkSetup = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch(
        appendOwnerQuery("/api/visitor-employees/leave-allocations"),
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as { setupRequired?: boolean };
      setSetupRequired(Boolean(json.setupRequired));
    } catch {
      /* panel handles errors */
    }
  }, [appendOwnerQuery]);

  useEffect(() => {
    if (!needsSelection) void checkSetup();
  }, [needsSelection, checkSetup]);

  if (authLoading || portalLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-primary-600">
        <p className="text-sm font-semibold text-white">Loading leave settings…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_PATH} /> : null}
      {isAdmin && needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {setupRequired ? <EmployeeSetupBanner /> : null}

      {!needsSelection ? (
        <div className="w-full overflow-hidden border border-[#e5e5e5]">
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
              Leave Day Settings
            </h1>
          </header>

          <div className="bg-primary-600 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <p className="mb-4 text-sm text-white/90">
              <Link href={VISITOR_MANAGEMENT_LEAVE_PATH} className="font-semibold underline-offset-2 hover:underline">
                ← Leave management
              </Link>
            </p>
            <LeaveAllocationSettingsPanel
              disabled={setupRequired}
              buildApiUrl={appendOwnerQuery}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
