"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatEmploymentType } from "@/lib/job-board-access";

type ListingSummary = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  poster_url: string | null;
  published_at: string | null;
  requires_paid_membership: boolean;
};

export default function JobsPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/job-board/listings", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setLoadError(typeof j.error === "string" ? j.error : "Could not load jobs");
          return;
        }
        if (!cancelled) {
          setListings(Array.isArray(j.listings) ? j.listings : []);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setLoadError("Could not load jobs");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Job Board
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Career opportunities from Changer Fusions and partners. Internships and industrial attachments are free to
              browse; full-time and contract roles need an active annual membership (KES&nbsp;500) after you apply.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="flex flex-col md:flex-row">
              <div className="relative w-full md:w-1/2 min-h-[240px] md:min-h-[320px] bg-gray-100 flex items-center justify-center">
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767691548/opportunity_dzeqxh.jpg"
                  alt="Career opportunities"
                  width={800}
                  height={600}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Grow with us</h3>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mr-3 text-primary-600 flex-shrink-0" />
                  <span>Mombasa &amp; remote-friendly roles</span>
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Applied through our portal? Unlock paid listings for one year with M-Pesa. Prefer internship or
                  attachment only? Those posts stay open to everyone at no charge.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/application"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply to join the talent pool
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {loadError && (
            <p className="text-center text-red-600 mb-6 text-sm" role="alert">
              {loadError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {listings.map((job, i) => (
              <motion.article
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.35) }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow"
              >
                <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary-50 via-white to-secondary-50 shrink-0">
                  {job.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URLs and arbitrary hosts
                    <img
                      src={job.poster_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Briefcase className="w-12 h-12 text-primary-200" aria-hidden />
                    </div>
                  )}
                  {job.requires_paid_membership && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 bg-amber-100/95 border border-amber-300/80 rounded-full px-2 py-0.5 shadow-sm">
                      <Lock className="w-3 h-3" /> Member
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1 min-h-0">
                  <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 mb-1">{job.title}</h2>
                  <p className="text-gray-600 text-sm font-medium mb-2 line-clamp-1">{job.company_name}</p>
                  <div className="text-xs text-gray-500 space-y-1 mb-3 flex-1">
                    {job.location && (
                      <p className="line-clamp-1">
                        <span className="font-medium text-gray-700">Loc:</span> {job.location}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-gray-700">Type:</span>{" "}
                      {formatEmploymentType(job.employment_type)}
                    </p>
                    {job.salary_text && (
                      <p className="line-clamp-2">
                        <span className="font-medium text-gray-700">Pay:</span> {job.salary_text}
                      </p>
                    )}
                    {job.summary && <p className="text-gray-600 line-clamp-2 pt-0.5">{job.summary}</p>}
                  </div>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center justify-center w-full mt-auto py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                  >
                    View details
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>

          {!loadError && listings.length === 0 && (
            <p className="text-center text-gray-500 py-12">
              No published vacancies right now. Check back soon or submit an application so we can match you when roles
              open.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
