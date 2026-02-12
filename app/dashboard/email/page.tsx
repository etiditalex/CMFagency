"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

export default function DashboardEmailPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, tier } = usePortal();

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!isAdmin && tier !== "pro" && tier !== "enterprise") router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isAdmin, tier, router, user]);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!isAdmin && tier !== "pro" && tier !== "enterprise") return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Email</h2>
          <p className="mt-1 text-gray-600 text-left max-w-3xl">
            Send updates to attendees (ticketing) or contestants/audience (voting).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
          >
            Campaigns
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 text-primary-700 font-extrabold">
          <MessagesSquare className="w-5 h-5" />
          Campaign communications
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Coming next: templates, segment selection (attendees/contestants), and delivery logs.
        </div>
      </div>
    </div>
  );
}

