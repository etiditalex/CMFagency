"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import IntegrationApiKeysPanel from "@/components/fusion-xpress/visitor-management/employees/IntegrationApiKeysPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";

export default function VisitorManagementHrPayrollApiPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();
  const { needsSelection, appendOwnerQuery } = useAdminBusinessScope();

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

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading HR &amp; payroll API…</p>;
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_PATH} /> : null}
      {isAdmin && needsSelection ? <AdminSelectBusinessPrompt /> : null}

      <div>
        <h1 className="text-2xl font-bold text-[#1a2332] flex items-center gap-2 pb-3 border-b border-[#e5e5e5]">
          <KeyRound className="w-7 h-7 text-primary-600" />
          HR &amp; Payroll API
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate API keys to connect attendance, leave, and payroll data with external HR systems.
        </p>
        <Link
          href={appendOwnerQuery(VISITOR_MANAGEMENT_EMPLOYEES_PATH)}
          className="mt-2 inline-block text-sm font-semibold text-primary-700 hover:underline"
        >
          ← Back to employees
        </Link>
      </div>

      {!needsSelection ? (
        <IntegrationApiKeysPanel disabled={needsSelection} buildApiUrl={appendOwnerQuery} />
      ) : null}
    </div>
  );
}
