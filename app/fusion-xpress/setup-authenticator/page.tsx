"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BusinessTotpSetupForm from "@/components/auth/BusinessTotpSetupForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { VISITOR_ONLY_DASHBOARD_PREFIX } from "@/lib/visitors/visitor-only-access";

export default function SetupAuthenticatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, loading } = useAuth();

  const redirectTo = useMemo(() => {
    const raw = searchParams?.get("redirect")?.trim();
    if (raw && raw.startsWith("/")) return raw;
    return "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) {
      const signIn =
        redirectTo.startsWith("/dashboard/visitor-management") ||
        redirectTo === VISITOR_ONLY_DASHBOARD_PREFIX
          ? "/fusion-xpress/smart-visitor-management/sign-in"
          : "/fusion-xpress";
      router.replace(signIn);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;
      const res = await fetch("/api/fusion-xpress/2fa/method", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        hasTotp?: boolean;
        totpRequired?: boolean;
      };
      if (cancelled) return;
      if (json.hasTotp) {
        router.replace(redirectTo);
      } else if (json.totpRequired === false) {
        router.replace(redirectTo);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user, router, redirectTo]);

  if (loading || !isAuthenticated) {
    return <p className="py-16 text-center text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <BusinessTotpSetupForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
