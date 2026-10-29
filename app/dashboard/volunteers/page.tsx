"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  creativeAreaLabel,
  formatSubmittedDate,
  isVolunteerStatus,
  roleLabel,
  statusLabel,
  VOLUNTEER_STATUSES,
  type VolunteerRole,
  type VolunteerStatus,
} from "@/lib/kfcaa-volunteers";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;

type Row = {
  id: string;
  applicationCode: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  town: string;
  residenceCounty: string;
  currentRole: string | null;
  role: VolunteerRole;
  region: string | null;
  representCounty: string | null;
  creativeAreas: string[];
  whyApply: string;
  communityExperience: string;
  howPromote: string;
  status: VolunteerStatus;
  createdAt: string;
};

type DbRow = {
  id: string;
  application_code: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  town: string;
  residence_county: string;
  current_role: string | null;
  role: VolunteerRole;
  region: string | null;
  represent_county: string | null;
  creative_areas: string[] | null;
  why_apply: string;
  community_experience: string;
  how_promote: string;
  status: string;
  created_at: string;
};

function cell(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : "—";
}

export default function DashboardVolunteersPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("kfcaa_volunteer_applications")
        .select(
          "id, application_code, full_name, phone, whatsapp, email, town, residence_county, current_role, role, region, represent_county, creative_areas, why_apply, community_experience, how_promote, status, created_at"
        )
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setRows(
        ((data as DbRow[]) ?? []).map((row) => ({
          id: row.id,
          applicationCode: row.application_code,
          fullName: row.full_name,
          phone: row.phone,
          whatsapp: row.whatsapp,
          email: row.email,
          town: row.town,
          residenceCounty: row.residence_county,
          currentRole: row.current_role,
          role: row.role,
          region: row.region,
          representCounty: row.represent_county,
          creativeAreas: row.creative_areas ?? [],
          whyApply: row.why_apply,
          communityExperience: row.community_experience,
          howPromote: row.how_promote,
          status: isVolunteerStatus(row.status) ? row.status : "new",
          createdAt: row.created_at,
        }))
      );
      setPage(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load volunteer applications";
      const missing = msg.includes("does not exist") || msg.includes("42P01") || msg.includes("application_code");
      setError(
        missing
          ? "Volunteer applications are not set up yet. Run database/ticketing_voting_mvp_patch_103_kfcaa_volunteer_applications.sql in the Supabase SQL editor."
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

  const updateStatus = async (id: string, status: VolunteerStatus) => {
    setUpdatingId(id);
    setStatusError(null);
    try {
      const { error: updateErr } = await supabase.from("kfcaa_volunteer_applications").update({ status }).eq("id", id);
      if (updateErr) throw updateErr;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    } catch (e: unknown) {
      setStatusError(e instanceof Error ? e.message : "Could not update the status.");
    } finally {
      setUpdatingId(null);
    }
  };

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
          <h2 className="border-b border-hairline pb-3 text-xl font-bold text-[#1a2332] md:text-2xl">Volunteers</h2>
          <p className="mt-1 max-w-3xl text-gray-600">
            Regional and county representative applications for the Kenya Fashion and Creative Arts Awards.
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

      {statusError ? <p className="mt-4 text-sm text-negative">{statusError}</p> : null}

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
          <p className="p-12 text-center text-gray-500">Loading volunteer applications...</p>
        ) : error ? (
          <p className="p-8 text-sm text-negative">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No volunteer applications yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                <thead className="bg-[#f4f7fb]">
                  <tr>
                    {[
                      "Application no.",
                      "Name",
                      "Role",
                      "Area",
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
                    const area = row.role === "regional" ? cell(row.region) : cell(row.representCounty);
                    return (
                      <Fragment key={row.id}>
                        <tr className={open ? "bg-secondary-50" : "odd:bg-white even:bg-slate-50/60"}>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-semibold text-gray-900">
                            <button type="button" onClick={() => setOpenId(open ? null : row.id)} className="hover:underline">
                              {row.applicationCode}
                            </button>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-medium text-gray-900">
                            {row.fullName}
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{roleLabel(row.role)}</td>
                          <td className="border-b border-hairline px-4 py-3 text-left">{area}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.phone}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.email}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            <select
                              aria-label={`Status for ${row.fullName}`}
                              value={row.status}
                              disabled={updatingId === row.id}
                              onChange={(event) => {
                                const next = event.target.value;
                                if (isVolunteerStatus(next)) void updateStatus(row.id, next);
                              }}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                            >
                              {VOLUNTEER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {formatSubmittedDate(row.createdAt)}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-secondary-50">
                            <td colSpan={8} className="border-b border-hairline px-4 py-5 text-left">
                              <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                                <p>
                                  <span className="font-semibold text-gray-900">WhatsApp:</span> {row.whatsapp}
                                </p>
                                <p>
                                  <span className="font-semibold text-gray-900">Lives in:</span> {row.town}, {row.residenceCounty}
                                </p>
                                <p>
                                  <span className="font-semibold text-gray-900">Region:</span> {cell(row.region)}
                                </p>
                                <p>
                                  <span className="font-semibold text-gray-900">Current role:</span> {cell(row.currentRole)}
                                </p>
                                <p className="md:col-span-2">
                                  <span className="font-semibold text-gray-900">Creative areas:</span>{" "}
                                  {row.creativeAreas.map(creativeAreaLabel).join(", ")}
                                </p>
                                <p className="md:col-span-2">
                                  <span className="font-semibold text-gray-900">Why apply:</span> {row.whyApply}
                                </p>
                                <p className="md:col-span-2">
                                  <span className="font-semibold text-gray-900">Community and networks:</span>{" "}
                                  {row.communityExperience}
                                </p>
                                <p className="md:col-span-2">
                                  <span className="font-semibold text-gray-900">How they will promote KFCAA:</span>{" "}
                                  {row.howPromote}
                                </p>
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
