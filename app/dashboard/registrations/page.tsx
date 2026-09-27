"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { ContestantCardPanel } from "@/components/events/ContestantCardPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { categoryLabel, formatIssuedDate, titleLabel, type ContestantCardData, type ContestantCategory, type ContestantTitle } from "@/lib/ideal-mr-miss";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;

type Registration = ContestantCardData & {
  id: string;
  status: "new" | "reviewed" | "shortlisted" | "rejected";
  dateOfBirth: string;
  phoneCalls: string | null;
  phoneWhatsapp: string | null;
  email: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  about: string;
  whyParticipate: string;
  talent: string;
  modelsForEducation: string;
};

type Row = {
  id: string;
  application_code: string;
  full_name: string;
  date_of_birth: string;
  applying_as: ContestantTitle;
  category: ContestantCategory;
  town_county: string;
  phone_calls: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  institution: string | null;
  about: string;
  why_participate: string;
  talent: string;
  models_for_education: string;
  status: Registration["status"];
  created_at: string;
};

function cell(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : "—";
}

export default function DashboardRegistrationsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState("500");
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMessage, setFeeMessage] = useState<string | null>(null);
  const [feeMessageIsError, setFeeMessageIsError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("ideal_mr_miss_applications")
        .select(
          "id, application_code, full_name, date_of_birth, applying_as, category, town_county, phone_calls, phone_whatsapp, email, guardian_name, guardian_phone, institution, about, why_participate, talent, models_for_education, status, created_at"
        )
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setRows(
        ((data as Row[]) ?? []).map((row) => ({
          id: row.id,
          applicationCode: row.application_code,
          fullName: row.full_name,
          dateOfBirth: row.date_of_birth,
          applyingAs: row.applying_as,
          category: row.category,
          townCounty: row.town_county,
          issuedOn: row.created_at,
          status: row.status,
          phoneCalls: row.phone_calls,
          phoneWhatsapp: row.phone_whatsapp,
          email: row.email,
          guardianName: row.guardian_name,
          guardianPhone: row.guardian_phone,
          institution: row.institution,
          about: row.about,
          whyParticipate: row.why_participate,
          talent: row.talent,
          modelsForEducation: row.models_for_education,
        }))
      );
      setPage(0);
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

  const loadFee = useCallback(async () => {
    setFeeLoading(true);
    setFeeMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/fusion-xpress/ideal-mr-miss-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { application_fee_kes?: number };
      if (res.ok && typeof json.application_fee_kes === "number") setFeeDraft(String(json.application_fee_kes));
    } finally {
      setFeeLoading(false);
    }
  }, []);

  const saveFee = async () => {
    const n = Math.floor(Number(feeDraft));
    if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
      setFeeMessage("Enter an amount between 1 and 1,000,000 KES.");
      setFeeMessageIsError(true);
      return;
    }
    setFeeSaving(true);
    setFeeMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/fusion-xpress/ideal-mr-miss-settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ application_fee_kes: n }),
      });
      const json = (await res.json().catch(() => ({}))) as { application_fee_kes?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save the application fee.");
      if (typeof json.application_fee_kes === "number") setFeeDraft(String(json.application_fee_kes));
      setFeeMessage("Application fee saved. The registration page now shows this amount.");
      setFeeMessageIsError(false);
    } catch (e: unknown) {
      setFeeMessage(e instanceof Error ? e.message : "Could not save the application fee.");
      setFeeMessageIsError(true);
    } finally {
      setFeeSaving(false);
    }
  };

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
    void loadFee();
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, load, loadFee, router, user]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [rows, safePage]
  );

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

      <div className="mt-6 border border-hairline bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-[#1a2332]">Application fee</h3>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          This is the amount shown on the public registration page. It starts at KES 500 and can be changed to another
          figure. Allowed range: 1–1,000,000 KES.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ideal-application-fee" className="block text-xs font-medium text-gray-700">
              Amount (KES)
            </label>
            <input
              id="ideal-application-fee"
              type="number"
              min={1}
              max={1_000_000}
              value={feeDraft}
              onChange={(e) => setFeeDraft(e.target.value)}
              disabled={feeLoading || feeSaving}
              className="mt-0.5 w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <button
            type="button"
            onClick={() => void saveFee()}
            disabled={feeLoading || feeSaving || feeDraft === ""}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {feeSaving ? "Saving..." : "Save fee"}
          </button>
        </div>
        {feeMessage ? (
          <p className={`mt-2 text-sm ${feeMessageIsError ? "text-negative" : "text-secondary-800"}`}>{feeMessage}</p>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 text-left">
          <h3 className="text-left text-sm font-extrabold uppercase tracking-wide text-gray-900">Applications</h3>
          {!loading && !error && rows.length > 0 ? (
            <p className="text-xs text-gray-500">
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
          ) : null}
        </div>
        {loading ? (
          <p className="p-12 text-center text-gray-500">Loading registrations...</p>
        ) : error ? (
          <p className="p-8 text-sm text-negative">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No contestant applications yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                <thead className="bg-[#f4f7fb]">
                  <tr>
                    {[
                      "Application no.",
                      "Name",
                      "Title",
                      "Category",
                      "Date of birth",
                      "Town and county",
                      "Phone",
                      "Email",
                      "Status",
                      "Submitted",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const open = openId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={open ? "bg-secondary-50" : "odd:bg-white even:bg-slate-50/60"}
                        >
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-semibold text-gray-900">
                            <button type="button" onClick={() => setOpenId(open ? null : row.id)} className="hover:underline">
                              {row.applicationCode}
                            </button>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-medium text-gray-900">{row.fullName}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{titleLabel(row.applyingAs)}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{categoryLabel(row.category)}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{formatIssuedDate(row.dateOfBirth)}</td>
                          <td className="border-b border-hairline px-4 py-3 text-left">{row.townCounty}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{cell(row.phoneCalls)}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{cell(row.email)}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left capitalize">{row.status}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{formatIssuedDate(row.issuedOn)}</td>
                        </tr>
                        {open ? (
                          <tr className="bg-secondary-50">
                            <td colSpan={10} className="border-b border-hairline px-4 py-5 text-left">
                              <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                                <p><span className="font-semibold text-gray-900">WhatsApp:</span> {cell(row.phoneWhatsapp)}</p>
                                <p><span className="font-semibold text-gray-900">Institution:</span> {cell(row.institution)}</p>
                                <p><span className="font-semibold text-gray-900">Guardian:</span> {cell(row.guardianName)}</p>
                                <p><span className="font-semibold text-gray-900">Guardian phone:</span> {cell(row.guardianPhone)}</p>
                                <p className="md:col-span-2"><span className="font-semibold text-gray-900">About:</span> {row.about}</p>
                                <p className="md:col-span-2"><span className="font-semibold text-gray-900">Why participate:</span> {row.whyParticipate}</p>
                                <p className="md:col-span-2"><span className="font-semibold text-gray-900">Talent:</span> {row.talent}</p>
                                <p className="md:col-span-2"><span className="font-semibold text-gray-900">Models for Education:</span> {row.modelsForEducation}</p>
                              </div>
                              <div className="mx-auto mt-5 max-w-2xl">
                                <ContestantCardPanel card={row} showIntro={false} />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > PAGE_SIZE ? (
              <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-gray-600">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
