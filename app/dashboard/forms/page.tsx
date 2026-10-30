"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  formatFormSubmittedDate,
  formsTableMissingMessage,
  isStarterFormSlug,
  parseFormFields,
  STARTER_FORMS,
} from "@/lib/fusion-forms";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;

type FormRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: string | null;
  createdAt: string;
  fieldCount: number;
  responses: number;
  href: string;
};

type DbForm = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  fields: unknown;
  published_at: string | null;
  created_at: string;
  link_href?: string | null;
  fusion_form_submissions?: { count: number }[] | null;
};

function publicHref(slug: string, linkHref: string | null | undefined) {
  const saved = linkHref?.trim();
  if (saved?.startsWith("/")) return saved;
  return STARTER_FORMS.find((form) => form.slug === slug)?.linkHref || `/forms/${slug}`;
}

async function ensureStarterForms() {
  const { data, error } = await supabase.from("fusion_forms").select("slug").in("slug", ["registration", "volunteers"]);
  if (error) return;
  const have = new Set((data ?? []).map((row) => String((row as { slug: string }).slug)));
  for (const starter of STARTER_FORMS) {
    if (have.has(starter.slug)) continue;
    const payload = {
      slug: starter.slug,
      title: starter.title,
      excerpt: starter.excerpt,
      intro: starter.intro,
      category: starter.category,
      image_url: starter.imageUrl,
      fields: [],
      link_href: starter.linkHref,
      published_at: starter.slug === "registration" ? "2026-01-01T00:00:00.000Z" : "2026-01-02T00:00:00.000Z",
    };
    const inserted = await supabase.from("fusion_forms").insert(payload);
    if (inserted.error?.message.includes("link_href")) {
      const { link_href: _ignored, ...withoutLink } = payload;
      await supabase.from("fusion_forms").insert(withoutLink);
    }
  }
}

export default function DashboardFormsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureStarterForms();
      let fetched = await supabase
        .from("fusion_forms")
        .select("id, slug, title, excerpt, category, fields, link_href, published_at, created_at, fusion_form_submissions(count)")
        .order("created_at", { ascending: true });
      if (fetched.error?.message.includes("link_href")) {
        fetched = await supabase
          .from("fusion_forms")
          .select("id, slug, title, excerpt, category, fields, published_at, created_at, fusion_form_submissions(count)")
          .order("created_at", { ascending: true });
      }
      if (fetched.error) throw fetched.error;
      const mapped = ((fetched.data as DbForm[]) ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        category: row.category,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        fieldCount: parseFormFields(row.fields).length,
        responses: row.fusion_form_submissions?.[0]?.count ?? 0,
        href: publicHref(row.slug, row.link_href),
      }));
      const starterOrder = STARTER_FORMS.map((form) => form.slug);
      mapped.sort((a, b) => {
        const aIndex = starterOrder.indexOf(a.slug as (typeof starterOrder)[number]);
        const bIndex = starterOrder.indexOf(b.slug as (typeof starterOrder)[number]);
        if (aIndex !== -1 || bIndex !== -1) {
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setRows(mapped);
      setPage(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load forms";
      setError(formsTableMissingMessage(message) ?? message);
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
    void load();
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, load, portalLoading, router, user]);

  const setPublished = async (row: FormRow, publish: boolean) => {
    setUpdatingId(row.id);
    setError(null);
    try {
      const publishedAt = publish ? row.publishedAt ?? new Date().toISOString() : null;
      const { error: updateErr } = await supabase.from("fusion_forms").update({ published_at: publishedAt }).eq("id", row.id);
      if (updateErr) throw updateErr;
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, publishedAt } : item)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update the form.");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeForm = async (row: FormRow) => {
    if (!confirm(`Delete “${row.title}” and its responses? This cannot be undone.`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      const { error: deleteErr } = await supabase.from("fusion_forms").delete().eq("id", row.id);
      if (deleteErr) throw deleteErr;
      setRows((current) => current.filter((item) => item.id !== row.id));
      setOpenId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete the form.");
    } finally {
      setDeletingId(null);
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
          <h2 className="border-b border-hairline pb-3 text-xl font-bold text-[#1a2332] md:text-2xl">Forms</h2>
          <p className="mt-1 max-w-3xl text-gray-600">
            Registration and Volunteers are listed first. Edit a row to change its card on the public Forms page. New forms you publish are added after them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/forms/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
          >
            <Plus className="h-4 w-4" />
            New form
          </Link>
        </div>
      </div>

      {error && rows.length > 0 ? <p className="mt-4 text-sm text-negative">{error}</p> : null}

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 text-left">
          <h3 className="text-left text-sm font-extrabold uppercase tracking-wide text-gray-900">Forms</h3>
          {!loading && !error && rows.length > 0 ? (
            <p className="text-xs text-gray-500">
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
          ) : null}
        </div>
        {loading ? (
          <p className="p-12 text-center text-gray-500">Loading forms...</p>
        ) : error && rows.length === 0 ? (
          <p className="p-8 text-sm text-negative">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">
            No forms yet.{" "}
            <Link href="/dashboard/forms/new" className="font-semibold text-primary-700 hover:underline">
              Create the first form
            </Link>
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[#f4f7fb]">
                  <tr>
                    {["Form", "Category", "Questions", "Responses", "Status", "Created"].map((heading) => (
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
                          <td className="border-b border-hairline px-4 py-3 text-left font-semibold text-gray-900">
                            <button type="button" onClick={() => setOpenId(open ? null : row.id)} className="text-left hover:underline">
                              {row.title}
                            </button>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.category || "—"}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.fieldCount}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            <Link href={`/dashboard/forms/${row.id}/submissions`} className="font-semibold text-primary-700 hover:underline">
                              {row.responses}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            <select
                              aria-label={`Status for ${row.title}`}
                              value={row.publishedAt ? "published" : "draft"}
                              disabled={updatingId === row.id}
                              onChange={(event) => void setPublished(row, event.target.value === "published")}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                            >
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {formatFormSubmittedDate(row.createdAt)}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-secondary-50">
                            <td colSpan={6} className="border-b border-hairline px-4 py-5 text-left">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-gray-900">Summary:</span> {row.excerpt?.trim() || "—"}
                              </p>
                              <p className="mt-2 text-sm text-gray-700">
                                <span className="font-semibold text-gray-900">Opens:</span> {row.href}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                                <Link href={`/dashboard/forms/${row.id}/edit`} className="text-primary-700 hover:underline">
                                  Edit
                                </Link>
                                <Link href={`/dashboard/forms/${row.id}/submissions`} className="text-primary-700 hover:underline">
                                  Responses
                                </Link>
                                {row.publishedAt ? (
                                  <Link href={row.href} target="_blank" className="text-primary-700 hover:underline">
                                    View public page
                                  </Link>
                                ) : null}
                                {isStarterFormSlug(row.slug) ? null : (
                                  <button
                                    type="button"
                                    onClick={() => void removeForm(row)}
                                    disabled={deletingId === row.id}
                                    className="text-red-600 hover:underline disabled:opacity-50"
                                  >
                                    {deletingId === row.id ? "Deleting…" : "Delete"}
                                  </button>
                                )}
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
