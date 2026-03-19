"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Route, PenLine } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import ManagedPageEditor from "@/components/dashboard/ManagedPageEditor";
import { MANAGED_PAGES_ROUTES } from "@/lib/managedPagesRoutes";

export default function DashboardPagesManagerPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [query, setQuery] = useState("");
  const sp = useSearchParams();
  const routeParam = sp?.get("route") ?? null;

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MANAGED_PAGES_ROUTES;
    return MANAGED_PAGES_ROUTES.filter((r) => r.route.toLowerCase().includes(q) || r.section.toLowerCase().includes(q));
  }, [query]);

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pages manager...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  if (routeParam) {
    return <ManagedPageEditor route={routeParam} />;
  }

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Pages</h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Careers and Services routes are mapped directly here for management. Service subpages now follow the Website Development design alignment.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search route, section, or type"
          className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Link
          href="/dashboard/pages/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800"
        >
          <PenLine className="w-4 h-4" />
          Create / Edit via picker
        </Link>
      </div>

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Route</th>
                <th className="px-6 py-3 font-bold text-gray-600">Section</th>
                <th className="px-6 py-3 font-bold text-gray-600">Dashboard mapped path</th>
                <th className="px-6 py-3 font-bold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={4}>
                    No routes matched your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.route} className="border-b border-gray-100">
                    <td className="px-6 py-4 font-mono text-gray-800">{item.route}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700">
                        {item.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">
                      {`/dashboard/pages?route=${encodeURIComponent(item.route)}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/pages?route=${encodeURIComponent(item.route)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                        >
                          <PenLine className="w-4 h-4" />
                          Edit
                        </Link>
                        <Link
                          href={item.route}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                        >
                          <Route className="w-4 h-4" />
                          Open public
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
