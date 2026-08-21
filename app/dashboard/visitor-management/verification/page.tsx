"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import VisitorVerificationPanel from "@/components/fusion-xpress/visitor-management/VisitorVerificationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { supabase } from "@/lib/supabase";
import {
  industryLabel,
  isVisitorIndustrySlug,
  VISITOR_MANAGEMENT_PATH,
  VISITOR_MANAGEMENT_VERIFICATION_PATH,
} from "@/lib/visitors/industry-options";
import type { VisitorRecord } from "@/lib/visitors/types";

const DEFAULT_INDUSTRY = "retail-hospitality";

export default function VisitorManagementVerificationPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isVisitorOnly, isAdmin } =
    usePortal();
  const {
    needsSelection,
    appendOwnerQuery,
    ownerId: adminOwnerId,
    industry: scopedIndustry,
  } = useAdminBusinessScope();

  const [organizationIndustry, setOrganizationIndustry] = useState(DEFAULT_INDUSTRY);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const activityOwnerId = isAdmin ? adminOwnerId : user?.id ?? "";
  const industrySlug =
    isAdmin && scopedIndustry && isVisitorIndustrySlug(scopedIndustry)
      ? scopedIndustry
      : organizationIndustry;

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const slug = String(meta?.organization_industry ?? "").trim();
      if (isVisitorIndustrySlug(slug)) setOrganizationIndustry(slug);
    });
  }, [user?.id]);

  const loadVisitors = useCallback(
    async (options?: { silent?: boolean }) => {
      if (isAdmin && needsSelection) {
        setVisitors([]);
        if (!options?.silent) setLoading(false);
        return;
      }
      if (!options?.silent) setLoading(true);
      setLoadError(null);
      setSetupRequired(false);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch(appendOwnerQuery("/api/visitors"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          visitors?: VisitorRecord[];
          setupRequired?: boolean;
          message?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to load visitors");
        if (json.setupRequired) {
          setSetupRequired(true);
          setVisitors([]);
          setLoadError(json.message ?? null);
        } else {
          setVisitors(Array.isArray(json.visitors) ? json.visitors : []);
        }
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : "Failed to load visitors");
        setVisitors([]);
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [appendOwnerQuery, getToken, isAdmin, needsSelection]
  );

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
      router.replace(VISITOR_MANAGEMENT_PATH);
      return;
    }
    void loadVisitors();
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
    loadVisitors,
  ]);

  const titleIndustry = useMemo(() => industryLabel(industrySlug), [industrySlug]);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-primary-600">
        <p className="text-sm font-semibold text-white">Loading visitor verification…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {isAdmin ? <BusinessScopeBar basePath={VISITOR_MANAGEMENT_VERIFICATION_PATH} /> : null}
      {isAdmin && needsSelection ? <AdminSelectBusinessPrompt /> : null}

      {setupRequired || loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError ??
            "Run database/visitor_management_patch_11_preregistration.sql in Supabase to enable verification."}
        </p>
      ) : null}

      {!needsSelection ? (
        <div className="w-full overflow-hidden border border-[#e5e5e5]">
          <header className="relative flex items-center bg-primary-900 px-4 py-3 sm:px-6">
            <div className="relative z-10 flex shrink-0 items-center">
              <Image
                src={BRAND_LOGO_URL}
                alt="CMF Agency"
                width={120}
                height={40}
                className="h-9 w-auto object-contain brightness-0 invert sm:h-10"
                priority
              />
            </div>
            <h1 className="pointer-events-none absolute inset-x-0 text-center text-lg font-extrabold tracking-wide text-white sm:text-xl">
              Visitor Verification System
            </h1>
          </header>

          <div className="bg-primary-600 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <p className="mb-4 text-sm text-white/90">
              <Link
                href={VISITOR_MANAGEMENT_PATH}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Visitor dashboard
              </Link>
              {" · "}
              Share the {titleIndustry} pre-registration form, then verify arrivals by device or
              contact number.
            </p>
            <VisitorVerificationPanel
              visitors={visitors}
              industrySlug={industrySlug}
              ownerId={activityOwnerId}
              disabled={setupRequired}
              buildApiUrl={appendOwnerQuery}
              onVisitorsChanged={() => void loadVisitors({ silent: true })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
