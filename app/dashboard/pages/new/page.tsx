"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { MANAGED_PAGES_ROUTES } from "@/lib/managedPagesRoutes";

export default function DashboardNewPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [route, setRoute] = useState(MANAGED_PAGES_ROUTES[0]?.route ?? "");

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  const section = useMemo(() => {
    return MANAGED_PAGES_ROUTES.find((r) => r.route === route)?.section ?? "services";
  }, [route]);

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Create Page</h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Choose a mapped Careers/Services route. This will create/update content in the dashboard-managed pages table.
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mapped route</label>
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MANAGED_PAGES_ROUTES.map((r) => (
                <option key={r.route} value={r.route}>
                  {r.route} ({r.section})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Section: {section}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/pages?route=${encodeURIComponent(route)}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800"
            >
              <Plus className="w-4 h-4" />
              Create / Edit this route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

