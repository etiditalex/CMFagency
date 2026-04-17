"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { AdminLoginExperience } from "@/components/fusion-xpress/AdminLoginExperience";

export default function FusionXpressAdminStandaloneLoginPage() {
  const searchParams = useSearchParams();
  const initialErrorKey = searchParams?.get("error") ?? null;

  const initialErrorMessage = useMemo(() => {
    if (initialErrorKey === "unauthorized") {
      return "Access denied. Your account is not registered for Fusion Xpress Admin.";
    }
    if (initialErrorKey === "setup") {
      return "Fusion Xpress portal is not configured yet. Please contact the system administrator.";
    }
    return null;
  }, [initialErrorKey]);

  return <AdminLoginExperience initialErrorMessage={initialErrorMessage} />;
}
