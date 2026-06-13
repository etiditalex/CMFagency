"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";

import { industryLabel, VISITOR_MANAGEMENT_ACCOUNTS_PATH } from "@/lib/visitors/industry-options";
import { supabase } from "@/lib/supabase";

type BusinessOption = {
  userId: string;
  businessName: string;
  email: string;
  industry: string | null;
};

type BusinessScopeBarProps = {
  /** Current page path without query string (e.g. /dashboard/visitor-management/employees) */
  basePath: string;
  className?: string;
};

export default function BusinessScopeBar({ basePath, className = "" }: BusinessScopeBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? basePath;
  const searchParams = useSearchParams();
  const selectedOwner = searchParams?.get("owner")?.trim() ?? "";

  const [accounts, setAccounts] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
          email: string;
          organization_industry: string | null;
        }[];
      };
      if (res.ok && Array.isArray(json.accounts)) {
        setAccounts(
          json.accounts.map((a) => ({
            userId: a.user_id,
            businessName: a.business_name || a.email || "Business",
            email: a.email,
            industry: a.organization_industry,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => accounts.find((a) => a.userId === selectedOwner) ?? null,
    [accounts, selectedOwner]
  );

  const onSelect = (userId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (userId) params.set("owner", userId);
    else params.delete("owner");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <Building2 className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 sm:max-w-md">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Business
          </span>
          <div className="relative">
            <select
              value={selectedOwner}
              onChange={(e) => onSelect(e.target.value)}
              disabled={loading}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">{loading ? "Loading…" : "Select a business"}</option>
              {accounts.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.businessName}
                  {a.industry ? ` · ${industryLabel(a.industry)}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </label>
        {selected?.industry ? (
          <span className="text-xs text-gray-500">{industryLabel(selected.industry)}</span>
        ) : null}
      </div>
      <Link
        href={VISITOR_MANAGEMENT_ACCOUNTS_PATH}
        className="text-xs font-semibold text-primary-700 hover:underline shrink-0"
      >
        All accounts
      </Link>
    </div>
  );
}

export function AdminSelectBusinessPrompt() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-gray-900">Select a business</p>
      <p className="mt-1 text-sm text-gray-500">Choose an account above to view its activity.</p>
    </div>
  );
}
