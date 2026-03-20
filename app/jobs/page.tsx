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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((job, i) => (
              <motion.article
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-primary-600">
                    <Briefcase className="w-5 h-5 flex-shrink-0" />
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h2>
                  </div>
                  {job.requires_paid_membership && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                      <Lock className="w-3 h-3" /> Member
                    </span>
                  )}
                </div>
                <p className="text-gray-600 font-medium mb-3">{job.company_name}</p>
                <div className="text-sm text-gray-500 space-y-1 mb-4 flex-1">
                  {job.location && (
                    <p>
                      <span className="font-medium text-gray-700">Location:</span> {job.location}
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Type:</span>{" "}
                    {formatEmploymentType(job.employment_type)}
                  </p>
                  {job.salary_text && (
                    <p>
                      <span className="font-medium text-gray-700">Compensation:</span> {job.salary_text}
                    </p>
                  )}
                  {job.summary && <p className="text-gray-600 pt-1">{job.summary}</p>}
                </div>
                <Link
                  href={`/jobs/${job.id}`}
                  className="inline-flex items-center justify-center w-full mt-auto py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black transition-colors"
                >
                  View details
                </Link>
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
