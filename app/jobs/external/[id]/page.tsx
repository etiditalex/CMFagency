"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, Calendar, ExternalLink, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEmploymentType } from "@/lib/job-board-access";

type ExternalJob = {
  id: string;
  source: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  description: string;
  apply_url: string;
  poster_url: string | null;
  industry: string | null;
  seniority: string | null;
  posted_at: string | null;
};

function sourceLabel(source: string) {
  switch (source) {
    case "remoteok":
      return "Remote OK";
    case "remotive":
      return "Remotive";
    case "jobicy":
      return "Jobicy";
    case "adzuna":
      return "Adzuna";
    default:
      return source;
  }
}

export default function ExternalJobDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ExternalJob | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid job");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/job-board/external/${encodeURIComponent(id)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Could not load job");
          setJob(null);
          return;
        }
        const J = j.job;
        if (J && typeof J === "object") {
          setJob({
            id: String(J.id),
            source: String(J.source ?? ""),
            title: String(J.title ?? ""),
            company_name: String(J.company_name ?? ""),
            location: J.location != null ? String(J.location) : null,
            employment_type: String(J.employment_type ?? ""),
            salary_text: J.salary_text != null ? String(J.salary_text) : null,
            summary: J.summary != null ? String(J.summary) : null,
            description: String(J.description ?? ""),
            apply_url: String(J.apply_url ?? ""),
            poster_url: J.poster_url != null ? String(J.poster_url) : null,
            industry: J.industry != null ? String(J.industry) : null,
            seniority: J.seniority != null ? String(J.seniority) : null,
            posted_at: J.posted_at != null ? String(J.posted_at) : null,
          });
          setError(null);
        } else {
          setJob(null);
          setError("Not found");
        }
      } catch {
        if (!cancelled) setError("Could not load job");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-gray-700 mb-4">{error ?? "Not found"}</p>
        <Link href="/jobs" className="text-primary-600 font-semibold underline">
          Back to job board
        </Link>
      </div>
    );
  }

  const posted =
    job.posted_at &&
    new Date(job.posted_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="mb-6">
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </Link>
          </div>

          {job.poster_url && (
            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md bg-gray-100 aspect-[21/9] max-h-[min(40vh,420px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.poster_url} alt="" className="w-full h-full object-cover object-center" />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-700 mb-2">
              Aggregated · {sourceLabel(job.source)}
            </p>
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{job.title}</h1>
            </div>
            <p className="text-xl text-gray-600 mb-6">{job.company_name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {job.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2 text-primary-600 shrink-0" />
                  <span>{job.location}</span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-primary-600 shrink-0" />
                <span>{formatEmploymentType(job.employment_type)}</span>
              </div>
              {job.industry && (
                <div className="flex items-start text-gray-600 md:col-span-2">
                  <span className="font-semibold text-gray-700 mr-2 shrink-0">Industry:</span>
                  <span>{job.industry}</span>
                </div>
              )}
              {job.seniority && (
                <div className="flex items-center text-gray-600">
                  <span className="font-semibold text-gray-700 mr-2">Level:</span>
                  <span>{job.seniority}</span>
                </div>
              )}
              {job.salary_text && (
                <div className="flex items-center text-gray-600 md:col-span-2">
                  <span className="font-semibold text-gray-700 mr-2">Compensation:</span>
                  {job.salary_text}
                </div>
              )}
              {posted && <div className="text-sm text-gray-600">Posted {posted}</div>}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This listing is provided by {sourceLabel(job.source)}. Apply on their site; Changer Fusions does not process
              applications for aggregated roles.
            </p>

            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              <ExternalLink className="w-5 h-5" />
              Apply on {sourceLabel(job.source)}
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
            {job.summary && <p className="text-gray-700 mb-4 whitespace-pre-line">{job.summary}</p>}
            <div className="prose max-w-none text-gray-700 whitespace-pre-line">{job.description}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
