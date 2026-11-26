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
    return <p className="py-12 text-center text-[13px] text-slate-500">Loading leave settings…</p>;
  }

  return (
    <div className="grid gap-4">
      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_PATH} /> : null}
      {isAdmin && needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {setupRequired ? <EmployeeSetupBanner /> : null}

      {!needsSelection ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="CMF Agency"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
            <h2 className="text-[15px] font-semibold text-slate-900">Leave Day Settings</h2>
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
