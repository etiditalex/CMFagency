"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import VisitorManagementDoc from "@/components/fusion-xpress/visitor-management/VisitorManagementDoc";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

export default function VisitorManagementDocsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
    }
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading documentation…</p>;
  }

  return <VisitorManagementDoc />;
}
