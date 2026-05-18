"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

import IndustryDemoForm from "@/components/fusion-xpress/visitor-management/IndustryDemoForm";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import type { IndustryDemo } from "@/lib/visitors/industry-demos";

export default function IndustryDemoFormClient({ demo }: { demo: IndustryDemo }) {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { hasFeature, loading: portalLoading } = usePortal();
  const [checkInScreen, setCheckInScreen] = useState(false);

  const ownerFromUrl =
    searchParams?.get("owner")?.trim() || searchParams?.get("business")?.trim() || "";

  const ownerFromSession =
    !portalLoading && isAuthenticated && user?.id && hasFeature("visitor_management")
      ? user.id
      : undefined;

  const ownerId = ownerFromUrl || ownerFromSession;

  return (
    <div
      className={`min-h-screen overflow-x-hidden ${checkInScreen ? "bg-gray-50" : "bg-white"}`}
    >
      <div
        className={`w-full px-4 pb-16 lg:px-10 ${
          checkInScreen ? "pt-6 sm:pt-8" : "pt-8 sm:pt-10"
        } sm:px-6`}
      >
        <div className="mx-auto max-w-lg">
          {!checkInScreen ? (
            <>
              <nav aria-label="Breadcrumb" className="mb-6">
                <Link
                  href="/fusion-xpress/smart-visitor-management"
                  className="inline-flex items-center gap-2 py-1.5 text-sm font-semibold leading-normal text-primary-600 hover:text-primary-800"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Smart Visitor Management</span>
                </Link>
              </nav>

              <header className="text-center">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-3xl">
                  {demo.title}
                </h1>
                <p className="mt-2 text-base leading-relaxed text-gray-500">{demo.subtitle}</p>
              </header>
            </>
          ) : null}

          <div className={checkInScreen ? "" : "mt-10"}>
            <IndustryDemoForm
              demo={demo}
              ownerId={ownerId}
              onCheckInScreen={setCheckInScreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
