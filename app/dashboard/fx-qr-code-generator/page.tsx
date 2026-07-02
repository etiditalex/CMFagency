"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, QrCode } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import FxQrCodeGeneratorDashboardGuide from "@/components/fusion-xpress/FxQrCodeGeneratorDashboardGuide";
import { FX_QR_GENERATOR_PATH } from "@/lib/fx-qr-code-generator-seo";

export default function DashboardFxQrCodeGeneratorPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isVisitorOnly } = usePortal();

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (isVisitorOnly) {
      router.replace("/dashboard/visitor-management");
    }
  }, [authLoading, isAuthenticated, isPortalMember, isVisitorOnly, portalLoading, router, user]);

  if (authLoading || portalLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
              <QrCode className="h-4 w-4" />
              Fusion Xpress
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-gray-900">FX QR Code Generator</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Your team creates QR codes on the public page. Use this dashboard section for promotion
              guidelines, citation snippets, directory submissions, and backlink outreach.
            </p>
          </div>
          <Link
            href={FX_QR_GENERATOR_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
          >
            Open public generator
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Public URL:{" "}
          <span className="font-mono text-gray-700">{FX_QR_GENERATOR_PATH}</span> — share this link with
          customers and on marketing materials.
        </p>
      </div>

      <FxQrCodeGeneratorDashboardGuide />
    </div>
  );
}
