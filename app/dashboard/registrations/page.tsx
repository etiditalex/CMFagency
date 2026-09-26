"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { ContestantCardPanel } from "@/components/events/ContestantCardPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { categoryLabel, titleLabel, type ContestantCardData, type ContestantCategory, type ContestantTitle } from "@/lib/ideal-mr-miss";
import { supabase } from "@/lib/supabase";

type Registration = ContestantCardData & {
  id: string;
  status: "new" | "reviewed" | "shortlisted" | "rejected";
  phoneCalls: string | null;
  email: string | null;
};

type Row = {
  id: string;
  application_code: string;
  full_name: string;
  applying_as: ContestantTitle;
  category: ContestantCategory;
  town_county: string;
  phone_calls: string | null;
  email: string | null;
  status: Registration["status"];
  created_at: string;
};

export default function DashboardRegistrationsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("ideal_mr_miss_applications")
        .select("id, application_code, full_name, applying_as, category, town_county, phone_calls, email, status, created_at")
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setRows(
        ((data as Row[]) ?? []).map((row) => ({
          id: row.id,
          applicationCode: row.application_code,
          fullName: row.full_name,
          applyingAs: row.applying_as,
          category: row.category,
          townCounty: row.town_county,
          issuedOn: row.created_at,
          status: row.status,
          phoneCalls: row.phone_calls,
          email: row.email,
        }))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load registrations";
      const missing = msg.includes("does not exist") || msg.includes("42P01") || msg.includes("application_code");
      setError(
        missing
          ? "Registrations are not set up yet. Run database/ticketing_voting_mvp_patch_92_ideal_mr_miss_applications.sql in the Supabase SQL editor."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, load, router, user]);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="border-b border-hairline pb-3 text-xl font-bold text-[#1a2332] md:text-2xl">Registrations</h2>
          <p className="mt-1 max-w-3xl text-gray-600">
            Contestant applications for Kenya’s Ideal Mr &amp; Miss 2026.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        {loading ? (
          <p className="p-12 text-center text-gray-500">Loading registrations...</p>
        ) : error ? (
          <p className="p-8 text-sm text-negative">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No contestant applications yet.</p>
        ) : (
          <div className="divide-y divide-hairline">
            {rows.map((row) => (
              <div key={row.id} className="p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                  className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{row.fullName}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {row.applicationCode} · {titleLabel(row.applyingAs)} · {categoryLabel(row.category)}
                    </p>
                  </div>
                  <span className="text-sm capitalize text-gray-500">{row.status}</span>
                </button>
                {openId === row.id ? (
                  <div className="mx-auto mt-5 max-w-2xl">
                    <ContestantCardPanel card={row} showIntro={false} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
