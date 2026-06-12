"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { isRealEstateIndustry } from "@/lib/employees/real-estate";
import { isRetailHospitalityIndustry } from "@/lib/employees/retail-hospitality";
import { supabase } from "@/lib/supabase";

export function useOrganizationIndustry() {
  const { user } = useAuth();
  const [industry, setIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIndustry(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const slug = String(meta?.organization_industry ?? meta?.organizationIndustry ?? "").trim();
      setIndustry(slug || null);
      setLoading(false);
    });
  }, [user?.id]);

  return {
    industry,
    loading,
    isRealEstate: isRealEstateIndustry(industry),
    isRetailHospitality: isRetailHospitalityIndustry(industry),
  };
}
