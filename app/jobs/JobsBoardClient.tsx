"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Briefcase, ChevronDown, Loader2, Lock, MapPin, Search, UserCircle } from "lucide-react";
import Link from "next/link";
import { formatEmploymentType } from "@/lib/job-board-access";
import type { JobListingSummary } from "@/lib/job-board-listings";
import { industryLabel, JOB_INDUSTRY_OPTIONS, JOB_SENIORITY_OPTIONS, seniorityLabel } from "@/lib/job-listing-taxonomy";
import {
  allMatchTerms,
  filterCountiesForInput,
  jobLocationMatchesAnyTerm,
  KENYA_COUNTY_DEFINITIONS,
  resolveLocationSearchTerms,
} from "@/lib/kenya-counties";

type JobTab = "find" | "saved" | "applications" | "preferences" | "seekers" | "employers";

const EMPLOYMENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Profession" },
  { value: "full_time", label: formatEmploymentType("full_time") },
  { value: "part_time", label: formatEmploymentType("part_time") },
  { value: "contract", label: formatEmploymentType("contract") },
  { value: "internship", label: formatEmploymentType("internship") },
  { value: "attachment", label: formatEmploymentType("attachment") },
];

type Props = {
  initialListings: JobListingSummary[];
  initialError: string | null;
};

export function JobsBoardClient({ initialListings, initialError }: Props) {
  const [listings] = useState<JobListingSummary[]>(initialListings);
  const [loadError] = useState<string | null>(initialError);
  const [activeTab, setActiveTab] = useState<JobTab>("find");
  const [jobQuery, setJobQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchJob, setSearchJob] = useState("");
  const [appliedLocationTerms, setAppliedLocationTerms] = useState<string[]>([]);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationWrapRef = useRef<HTMLDivElement>(null);
  const locationListBaseId = useId();
  const locationListId = `${locationListBaseId}-list`;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!locationWrapRef.current?.contains(e.target as Node)) setLocationOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [professionFilter, setProfessionFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("");

  const [empCompany, setEmpCompany] = useState("");
  const [empContact, setEmpContact] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empConfirm, setEmpConfirm] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [empSuccess, setEmpSuccess] = useState<string | null>(null);

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
          : "Account created. Sign in using the employer portal link below."
      );
      setEmpPassword("");
      setEmpConfirm("");
    } catch {
      setEmpError("Something went wrong. Try again.");
    } finally {
      setEmpLoading(false);
    }
  };

  const applySearch = () => {
    setSearchJob(jobQuery);
    setAppliedLocationTerms(resolveLocationSearchTerms(locationQuery));
    setLocationOpen(false);
  };

  const pickCounty = (label: string) => {
    setLocationQuery(label);
    const def = KENYA_COUNTY_DEFINITIONS.find((d) => d.label === label);
    setAppliedLocationTerms(def ? allMatchTerms(def) : resolveLocationSearchTerms(label));
    setSearchJob(jobQuery);
    setLocationOpen(false);
  };

  const countySuggestions = useMemo(
    () => filterCountiesForInput(locationQuery, 20),
    [locationQuery]
  );

  const filteredListings = useMemo(() => {
    const jq = searchJob.trim().toLowerCase();
    return listings.filter((job) => {
      if (jq) {
        const hay = `${job.title} ${job.company_name} ${job.summary ?? ""}`.toLowerCase();
        if (!hay.includes(jq)) return false;
      }
      if (!jobLocationMatchesAnyTerm(job.location, appliedLocationTerms)) return false;
      if (professionFilter && job.employment_type !== professionFilter) return false;
      if (industryFilter && job.industry !== industryFilter) return false;
      if (seniorityFilter && job.seniority !== seniorityFilter) return false;
      return true;
    });
  }, [listings, searchJob, appliedLocationTerms, professionFilter, industryFilter, seniorityFilter]);

  const selectClass =
    "w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-9 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

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
                    activeTab === id
                      ? "text-primary-600"
                      : "text-gray-600 hover:text-gray-900"
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
            <div className="mb-8 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-3">
                <label className="relative flex min-w-0 flex-1">
                  <span className="sr-only">Search jobs</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={jobQuery}
                    onChange={(e) => setJobQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    placeholder="Show jobs"
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <div ref={locationWrapRef} className="relative min-w-0 flex-1">
                  <span className="sr-only" id={`${locationListBaseId}-label`}>
                    Location — Kenya counties, towns, or free text
                  </span>
                  <MapPin
                    className="pointer-events-none absolute left-3 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    role="combobox"
                    aria-expanded={locationOpen}
                    aria-controls={locationListId}
                    aria-autocomplete="list"
                    aria-labelledby={`${locationListBaseId}-label`}
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setLocationOpen(true);
                    }}
                    onFocus={() => setLocationOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearch();
                      if (e.key === "Escape") setLocationOpen(false);
                    }}
                    placeholder="County, town, or city (Kenya)"
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  {locationOpen && countySuggestions.length > 0 && (
                    <ul
                      id={locationListId}
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      {countySuggestions.map((c) => (
                        <li key={c.label} role="presentation">
                          <button
                            type="button"
                            role="option"
                            className="flex w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickCounty(c.label)}
                          >
                            {c.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={applySearch}
                  className="shrink-0 rounded-lg bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 lg:self-stretch"
                >
                  Show jobs
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <select
                    aria-label="Listing status"
                    defaultValue="published"
                    className={selectClass}
                  >
                    <option value="published">Published</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
                <div className="relative">
                  <select
                    aria-label="Profession"
                    value={professionFilter}
                    onChange={(e) => setProfessionFilter(e.target.value)}
                    className={selectClass}
                  >
                    {EMPLOYMENT_FILTER_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
                <div className="relative">
                  <select
                    aria-label="Industry"
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className={selectClass}
                  >
                    {JOB_INDUSTRY_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
                <div className="relative">
                  <select
                    aria-label="Seniority"
                    value={seniorityFilter}
                    onChange={(e) => setSeniorityFilter(e.target.value)}
                    className={selectClass}
                  >
                    {JOB_SENIORITY_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          )}

          {(activeTab === "saved" ||
            activeTab === "applications" ||
            activeTab === "preferences") && (
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
                  Use <strong>Find job</strong> to search open roles, filter by location (including Kenya counties), industry,
                  and seniority.
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
            <div className="mb-10 rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-left">
              <h2 className="text-left text-lg font-bold text-gray-900 mb-6">For employers — hiring account</h2>
              {empSuccess ? (
                <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-secondary-950 text-sm mb-4">
                  {empSuccess}
                  <div className="mt-4">
                    <Link
                      href="/fusion-xpress"
                      className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Open employer portal sign-in
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    After login, open <strong>Job listings</strong> in the sidebar to create and publish roles.
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
                  <p className="text-xs text-gray-500">
                    Already registered?{" "}
                    <Link href="/fusion-xpress" className="font-semibold text-primary-600 underline">
                      Sign in to the dashboard
                    </Link>
                  </p>
                </form>
              )}
            </div>
          )}

          {activeTab === "find" && loadError && (
            <p className="mb-6 text-sm text-red-600" role="alert">
              {loadError}
            </p>
          )}

          {activeTab === "find" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
              {filteredListings.map((job) => (
                <article
                  key={job.id}
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
                    {job.requires_paid_membership && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-100/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 shadow-sm">
                        <Lock className="h-3 w-3" /> Member
                      </span>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col p-4">
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
                      {industryLabel(job.industry) && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-700">Industry:</span>{" "}
                          {industryLabel(job.industry)}
                        </p>
                      )}
                      {seniorityLabel(job.seniority) && (
                        <p className="line-clamp-1">
                          <span className="font-medium text-gray-700">Level:</span>{" "}
                          {seniorityLabel(job.seniority)}
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
                      href={`/jobs/${job.id}`}
                      className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                    >
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === "find" && !loadError && filteredListings.length === 0 && (
            <p className="py-12 text-center text-gray-500">
              {listings.length === 0
                ? "No published vacancies right now. Check back soon or submit an application so we can match you when roles open."
                : "No jobs match your search. Try different keywords or filters."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
