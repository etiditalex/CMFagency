"use client";

import { useMemo, useState } from "react";
import { Briefcase, Loader2, Lock, Search, Sparkles, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatEmploymentType } from "@/lib/job-board-access";
import type { UnifiedJobListing } from "@/lib/job-board-feed";
import { industryLabel, seniorityLabel } from "@/lib/job-listing-taxonomy";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

type JobTab = "find" | "saved" | "applications" | "preferences" | "seekers" | "employers";

type Props = {
  initialJobs: UnifiedJobListing[];
  initialError: string | null;
  initialQuery: string;
};

function displayIndustry(industry: string | null) {
  if (!industry?.trim()) return null;
  return industryLabel(industry) || industry;
}

function displaySeniority(seniority: string | null) {
  if (!seniority?.trim()) return null;
  return seniorityLabel(seniority) || seniority;
}

export function JobsBoardClient({ initialJobs, initialError, initialQuery }: Props) {
  const router = useRouter();
  const [jobs] = useState<UnifiedJobListing[]>(initialJobs);
  const [loadError] = useState<string | null>(initialError);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<JobTab>("find");

  const [profileText, setProfileText] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchOrder, setMatchOrder] = useState<string[] | null>(null);
  const [matchReasons, setMatchReasons] = useState<Record<string, string>>({});

  const [empCompany, setEmpCompany] = useState("");
  const [empContact, setEmpContact] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empConfirm, setEmpConfirm] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [empSuccess, setEmpSuccess] = useState<string | null>(null);

  const displayJobs = useMemo(() => {
    if (!matchOrder?.length) return jobs;
    const set = new Set(matchOrder);
    const first: UnifiedJobListing[] = [];
    for (const id of matchOrder) {
      const j = jobs.find((x) => x.id === id);
      if (j) first.push(j);
    }
    const rest = jobs.filter((j) => !set.has(j.id));
    return [...first, ...rest];
  }, [jobs, matchOrder]);

  const submitEmployerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError(null);
    setEmpSuccess(null);
    if (empPassword !== empConfirm) {
      setEmpError("Passwords do not match.");
      return;
    }
    if (empPassword.length < 8) {
      setEmpError("Password must be at least 8 characters.");
      return;
    }
    setEmpLoading(true);
    try {
      const res = await fetch("/api/employers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: empEmail.trim(),
          password: empPassword,
          company_name: empCompany.trim(),
          contact_name: empContact.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmpError(typeof j.error === "string" ? j.error : "Registration failed.");
        return;
      }
      setEmpSuccess(
        typeof j.message === "string"
          ? j.message
          : "Account created. Sign in below with your email and password."
      );
      setEmpPassword("");
      setEmpConfirm("");
    } catch {
      setEmpError("Something went wrong. Try again.");
    } finally {
      setEmpLoading(false);
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    const url = q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs";
    router.push(url);
  };

  const clearSearch = () => {
    setSearchInput("");
    router.push("/jobs");
  };

  const runAiMatch = async () => {
    setMatchError(null);
    setMatchLoading(true);
    try {
      const res = await fetch("/api/job-board/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMatchError(typeof j.error === "string" ? j.error : "Could not run matcher.");
        setMatchOrder(null);
        setMatchReasons({});
        return;
      }
      const matches = Array.isArray(j.matches) ? j.matches : [];
      const order: string[] = [];
      const reasons: Record<string, string> = {};
      for (const m of matches) {
        if (m && typeof m.id === "string") {
          order.push(m.id);
          if (typeof m.reason === "string") reasons[m.id] = m.reason;
        }
      }
      setMatchOrder(order.length ? order : null);
      setMatchReasons(reasons);
    } catch {
      setMatchError("Network error.");
      setMatchOrder(null);
      setMatchReasons({});
    } finally {
      setMatchLoading(false);
    }
  };

  const clearMatch = () => {
    setMatchOrder(null);
    setMatchReasons({});
    setMatchError(null);
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom">
          <div className="mb-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8" role="tablist" aria-label="Job board sections">
              {(
                [
                  ["find", "Find job"],
                  ["saved", "Saved"],
                  ["applications", "My applications"],
                  ["preferences", "Career preferences"],
                  ["seekers", "For Job seekers"],
                  ["employers", "For employers"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`relative pb-3 text-sm font-semibold transition-colors md:text-base ${
                    activeTab === id ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                  {activeTab === id && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-600"
                      aria-hidden
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "find" && (
            <div className="mb-6 space-y-4 text-left">
              <form onSubmit={applySearch} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 max-w-2xl">
                <label className="relative flex min-w-0 flex-1">
                  <span className="sr-only">Search jobs</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search title, company, keywords…"
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-700"
                  >
                    Search
                  </button>
                  {initialQuery ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Clear
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-w-3xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                  <Sparkles className="h-4 w-4 text-primary-600" aria-hidden />
                  AI job match
                </div>
                <textarea
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  rows={3}
                  placeholder="e.g. Mid-level React developer in Nairobi; open to remote; interested in fintech…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={matchLoading}
                    onClick={runAiMatch}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {matchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Suggest matches
                  </button>
                  {matchOrder ? (
                    <button
                      type="button"
                      onClick={clearMatch}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Reset order
                    </button>
                  ) : null}
                </div>
                {matchError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {matchError}
                  </p>
                )}
              </div>
            </div>
          )}

          {(activeTab === "saved" || activeTab === "applications" || activeTab === "preferences") && (
            <div className="mb-10 rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
              <p className="text-sm md:text-base">
                {activeTab === "saved" && "Save jobs from listings to see them here. This feature is coming soon."}
                {activeTab === "applications" && (
                  <>
                    Track applications you submit through our site here soon. You can still{" "}
                    <Link href="/application" className="font-semibold text-primary-600 underline">
                      apply to the talent pool
                    </Link>
                    .
                  </>
                )}
                {activeTab === "preferences" &&
                  "Set your career preferences to get better matches. This feature is coming soon."}
              </p>
            </div>
          )}

          {activeTab === "seekers" && (
            <div className="mb-10 rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-left text-gray-700">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary-600" aria-hidden />
                For job seekers
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base">
                <li>
                  Use <strong>Find job</strong> to search aggregated listings and employer posts on one board.
                </li>
                <li>
                  Try <strong>AI job match</strong> with a short profile to reorder suggestions.
                </li>
                <li>
                  Apply to our talent pool anytime:{" "}
                  <Link href="/application" className="font-semibold text-primary-600 underline">
                    Submit an application
                  </Link>
                  .
                </li>
                <li>Saved jobs, application tracking, and career preferences are coming soon—use the tabs above when they go live.</li>
              </ul>
            </div>
          )}

          {activeTab === "employers" && (
            <div className="mb-10 space-y-10">
              <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-left">
                <h2 className="text-left text-lg font-bold text-gray-900 mb-2">Sign in</h2>
                <p className="text-sm text-gray-600 mb-4 max-w-xl">
                  Use the same email and password you set when you created your hiring account. You will be asked for a
                  one-time code by email, then taken to the dashboard to manage <strong>Job listings</strong>.
                </p>
                <div className="max-w-md">
                  <PortalLoginForm layout="embedded" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-left">
                <h2 className="text-left text-lg font-bold text-gray-900 mb-2">New employer — create hiring account</h2>
                <p className="text-sm text-gray-600 mb-6 max-w-xl">
                  Register here, then sign in using the form above. Job descriptions, requirements, and filters are edited in
                  the Fusion dashboard, not on this page.
                </p>

                {empSuccess ? (
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-secondary-950 text-sm max-w-lg">
                    {empSuccess}
                    <p className="mt-3 text-xs text-gray-600">
                      Sign in with the form above, then open <strong>Job listings</strong> in the sidebar.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitEmployerRegister} className="max-w-lg space-y-4">
                    {empError && (
                      <p className="text-sm text-red-600" role="alert">
                        {empError}
                      </p>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company / organisation *</label>
                      <input
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={empCompany}
                        onChange={(e) => setEmpCompany(e.target.value)}
                        autoComplete="organization"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={empContact}
                        onChange={(e) => setEmpContact(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work email *</label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 8 characters)</label>
                      <input
                        required
                        type="password"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
                      <input
                        required
                        type="password"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={empConfirm}
                        onChange={(e) => setEmpConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={empLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                    >
                      {empLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create hiring account
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === "find" && loadError && (
            <p className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">
              {loadError}
            </p>
          )}

          {activeTab === "find" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
              {displayJobs.map((job) => (
                <article
                  key={`${job.source}-${job.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full shrink-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                    {job.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URLs and arbitrary hosts
                      <img
                        src={job.poster_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Briefcase className="h-12 w-12 text-primary-200" aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-800 shadow-sm border border-gray-200">
                      {job.attribution}
                    </span>
                    {job.requires_paid_membership && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-100/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 shadow-sm">
                        <Lock className="h-3 w-3" /> Member
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col p-4">
                    {matchReasons[job.id] && (
                      <p className="mb-2 rounded-md bg-primary-50 px-2 py-1.5 text-[11px] leading-snug text-primary-950 border border-primary-100">
                        <span className="font-semibold">Match: </span>
                        {matchReasons[job.id]}
                      </p>
                    )}
                    <h2 className="mb-1 line-clamp-2 text-base font-bold leading-snug text-gray-900">{job.title}</h2>
                    <p className="mb-2 line-clamp-1 text-sm font-medium text-gray-600">{job.company_name}</p>
                    <div className="mb-3 flex-1 space-y-1 text-xs text-gray-500">
                      {job.location && (
                        <p className="line-clamp-1">
                          <span className="font-medium text-gray-700">Loc:</span> {job.location}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-gray-700">Type:</span>{" "}
                        {formatEmploymentType(job.employment_type)}
                      </p>
                      {displayIndustry(job.industry) && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-700">Industry:</span> {displayIndustry(job.industry)}
                        </p>
                      )}
                      {displaySeniority(job.seniority) && (
                        <p className="line-clamp-1">
                          <span className="font-medium text-gray-700">Level:</span> {displaySeniority(job.seniority)}
                        </p>
                      )}
                      {job.salary_text && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-700">Pay:</span> {job.salary_text}
                        </p>
                      )}
                      {job.summary && <p className="line-clamp-2 pt-0.5 text-gray-600">{job.summary}</p>}
                    </div>
                    <Link
                      href={job.detail_path}
                      className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                    >
                      {job.source === "employer" ? "View details" : "View & apply"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === "find" && !loadError && jobs.length === 0 && (
            <p className="py-12 text-center text-gray-500">
              No jobs to show yet. If you expect remote listings, run the aggregate sync (see deployment docs) or check back
              after the cron job runs. Employer posts appear here as soon as they are published from the dashboard.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
