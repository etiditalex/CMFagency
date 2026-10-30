"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  formStatusLabel,
  formatFormSubmittedDate,
  formsTableMissingMessage,
  isFormSubmissionStatus,
  parseStoredAnswers,
  FORM_SUBMISSION_STATUSES,
  type FormSubmissionStatus,
  type StoredFormAnswer,
} from "@/lib/fusion-forms";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;

type Row = {
  id: string;
  code: string;
  name: string;
  email: string;
  answers: StoredFormAnswer[];
  status: FormSubmissionStatus;
  createdAt: string;
};

export default function DashboardFormSubmissionsPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const formId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [title, setTitle] = useState("Form");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: form, error: formErr } = await supabase.from("fusion_forms").select("title").eq("id", formId).maybeSingle();
      if (formErr) throw formErr;
      if (!form) throw new Error("Form not found.");
      setTitle(String((form as { title?: string }).title || "Form"));
      const { data, error: fetchErr } = await supabase
        .from("fusion_form_submissions")
        .select("id, submission_code, submitter_name, submitter_email, answers, status, created_at")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setRows(
        ((data as {
          id: string;
          submission_code: string;
          submitter_name: string | null;
          submitter_email: string | null;
          answers: unknown;
          status: string;
          created_at: string;
        }[]) ?? []).map((row) => ({
          id: row.id,
          code: row.submission_code,
          name: row.submitter_name?.trim() || "—",
          email: row.submitter_email?.trim() || "—",
          answers: parseStoredAnswers(row.answers),
          status: isFormSubmissionStatus(row.status) ? row.status : "new",
          createdAt: row.created_at,
        }))
      );
      setPage(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load responses";
      setError(formsTableMissingMessage(message) ?? message);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (authLoading || portalLoading || !formId) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [authLoading, formId, isAuthenticated, isAdmin, isPortalMember, load, portalLoading, router, user]);

  const updateStatus = async (id: string, status: FormSubmissionStatus) => {
    setUpdatingId(id);
    setStatusError(null);
    try {
      const { error: updateErr } = await supabase.from("fusion_form_submissions").update({ status }).eq("id", id);
      if (updateErr) throw updateErr;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Could not update the status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [rows, safePage]);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="border-b border-hairline pb-3 text-xl font-bold text-[#1a2332] md:text-2xl">{title}</h2>
          <p className="mt-1 max-w-3xl text-gray-600">Responses submitted on this form. Open a reference number to read the full answers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/forms"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            All forms
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {statusError ? <p className="mt-4 text-sm text-negative">{statusError}</p> : null}

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 text-left">
          <h3 className="text-left text-sm font-extrabold uppercase tracking-wide text-gray-900">Responses</h3>
          {!loading && !error && rows.length > 0 ? (
            <p className="text-xs text-gray-500">
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
          ) : null}
        </div>
        {loading ? (
          <p className="p-12 text-center text-gray-500">Loading responses...</p>
        ) : error ? (
          <p className="p-8 text-sm text-negative">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No responses yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[#f4f7fb]">
                  <tr>
                    {["Reference", "Name", "Email", "Status", "Submitted"].map((heading) => (
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
                        <tr className={open ? "bg-secondary-50" : "odd:bg-white even:bg-slate-50/60"}>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-semibold text-gray-900">
                            <button type="button" onClick={() => setOpenId(open ? null : row.id)} className="hover:underline">
                              {row.code}
                            </button>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-medium text-gray-900">{row.name}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.email}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            <select
                              aria-label={`Status for ${row.code}`}
                              value={row.status}
                              disabled={updatingId === row.id}
                              onChange={(event) => {
                                const next = event.target.value;
                                if (isFormSubmissionStatus(next)) void updateStatus(row.id, next);
                              }}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                            >
                              {FORM_SUBMISSION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {formStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {formatFormSubmittedDate(row.createdAt)}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-secondary-50">
                            <td colSpan={5} className="border-b border-hairline px-4 py-5 text-left">
                              <div className="grid gap-3 text-sm text-gray-700">
                                {row.answers.map((answer) => (
                                  <p key={`${row.id}-${answer.id}-${answer.label}`}>
                                    <span className="font-semibold text-gray-900">{answer.label}:</span> {answer.value || "—"}
                                  </p>
                                ))}
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
