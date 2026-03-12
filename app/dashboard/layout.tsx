"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

/**
 * Dashboard layout: enforces portal membership and 2FA (email code) before showing any dashboard route.
 * Redirects to /fusion-xpress if not logged in, not a portal member, or code not verified this session.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading } = usePortal();

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
      const status = (await res.json().catch(() => ({}))) as { verified?: boolean };
      if (!cancelled && !status.verified) {
        router.replace("/fusion-xpress");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, user, router]);

  return <>{children}</>;
}
