"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { usePortal } from "@/contexts/PortalContext";
import { isRealEstateIndustry } from "@/lib/employees/real-estate";
import { isRetailHospitalityIndustry } from "@/lib/employees/retail-hospitality";
import { withOwnerQuery } from "@/lib/visitors/admin-business-scope-api";
import { supabase } from "@/lib/supabase";

type SelectedBusiness = {
  userId: string;
  businessName: string;
  industry: string | null;
};

export function useAdminBusinessScope() {
  const { isAdmin } = usePortal();
  const searchParams = useSearchParams();
  const ownerId = searchParams?.get("owner")?.trim() ?? "";

  const [selectedBusiness, setSelectedBusiness] = useState<SelectedBusiness | null>(null);

  const needsSelection = isAdmin && !ownerId;

  useEffect(() => {
    if (!isAdmin || !ownerId) {
      setSelectedBusiness(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/visitor-management/accounts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json()) as {
        accounts?: {
          user_id: string;
          business_name: string;
          organization_industry: string | null;
        }[];
      };
      if (cancelled || !res.ok) return;
      const match = (json.accounts ?? []).find((a) => a.user_id === ownerId);
      if (match) {
        setSelectedBusiness({
          userId: match.user_id,
          businessName: match.business_name || "Business",
          industry: match.organization_industry,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, ownerId]);

  const appendOwnerQuery = useCallback(
    (url: string) => withOwnerQuery(url, isAdmin, ownerId),
    [isAdmin, ownerId]
  );

  const industry = selectedBusiness?.industry ?? null;

  return useMemo(
    () => ({
      isAdmin,
      ownerId,
      needsSelection,
      businessName: selectedBusiness?.businessName ?? null,
      industry,
      isRealEstate: isRealEstateIndustry(industry),
      isRetailHospitality: isRetailHospitalityIndustry(industry),
      appendOwnerQuery,
    }),
    [appendOwnerQuery, industry, isAdmin, needsSelection, ownerId, selectedBusiness?.businessName]
  );
}
