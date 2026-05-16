"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  isVisitorOnlyAllowedDashboardPath,
  VISITOR_ONLY_DASHBOARD_PREFIX,
} from "@/lib/visitors/visitor-only-access";

const VISITOR_SIGN_IN = "/fusion-xpress/smart-visitor-management/sign-in";

/**
 * Dashboard layout: enforces portal membership and 2FA (email code) before showing any dashboard route.
 * Visitor-only accounts are restricted to Smart Visitor Management routes.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isVisitorOnly } = usePortal();

  useEffect(() => {
    if (authLoading || portalLoading) return;

    const isVisitorDashboardPath = pathname.startsWith("/dashboard/visitor-management");
    const loginFallback = isVisitorDashboardPath || isVisitorOnly ? VISITOR_SIGN_IN : "/fusion-xpress";

    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace(loginFallback);
      return;
    }

    if (isVisitorOnly && !isVisitorOnlyAllowedDashboardPath(pathname)) {
      router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
      const status = (await res.json().catch(() => ({}))) as { verified?: boolean };
      if (!cancelled && !status.verified) {
        router.replace(loginFallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isVisitorOnly, pathname, user, router]);

  return <>{children}</>;
}
