"use client";

import Link from "next/link";
import { Briefcase, MapPin, Calendar, ArrowLeft, Mail, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatEmploymentType } from "@/lib/job-board-access";

type ListingFull = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  description: string;
  requirements: string[];
  benefits: string[];
  contact_email: string | null;
  published_at: string | null;
};

export default function JobDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingFull | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid job");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/job-board/listings/${encodeURIComponent(id)}`, { headers, cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(res.status === 404 ? "This job is no longer available." : "Could not load job");
          setListing(null);
          return;
        }
        setLocked(j.locked === true);
        setMessage(typeof j.message === "string" ? j.message : null);
        const L = j.listing;
        if (L && typeof L === "object") {
          const req = Array.isArray(L.requirements) ? L.requirements.map(String) : [];
          const ben = Array.isArray(L.benefits) ? L.benefits.map(String) : [];
          setListing({
            id: String(L.id),
            title: String(L.title ?? ""),
            company_name: String(L.company_name ?? ""),
            location: L.location != null ? String(L.location) : null,
            employment_type: String(L.employment_type ?? ""),
            salary_text: L.salary_text != null ? String(L.salary_text) : null,
            summary: L.summary != null ? String(L.summary) : null,
            description: String(L.description ?? ""),
            requirements: req,
            benefits: ben,
            contact_email: L.contact_email != null ? String(L.contact_email) : null,
            published_at: L.published_at != null ? String(L.published_at) : null,
          });
        } else {
          setListing(null);
        }
        setError(null);
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

  if (error || !listing) {
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
    listing.published_at &&
    new Date(listing.published_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const mailHref = listing.contact_email
    ? `mailto:${listing.contact_email}?subject=${encodeURIComponent(`Application: ${listing.title}`)}`
    : "mailto:info@cmfagency.co.ke?subject=" + encodeURIComponent(`Application: ${listing.title}`);

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{listing.title}</h1>
            </div>
            <p className="text-xl text-gray-600 mb-6">{listing.company_name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {listing.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                  <span>{listing.location}</span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                <span>{formatEmploymentType(listing.employment_type)}</span>
              </div>
              {listing.salary_text && (
                <div className="flex items-center text-gray-600 md:col-span-2">
                  <span className="font-semibold text-gray-700 mr-2">Compensation:</span>
                  {listing.salary_text}
                </div>
              )}
              {posted && (
                <div className="flex items-center text-gray-600">
                  <span className="text-sm">Posted {posted}</span>
                </div>
              )}
            </div>

            {locked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-amber-950">
                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Members only</p>
                  <p className="text-sm mt-1">{message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/login" className="text-sm font-semibold text-primary-700 underline">
                      Sign in
                    </Link>
                    <span className="text-sm text-amber-900">·</span>
                    <Link href="/application" className="text-sm font-semibold text-primary-700 underline">
                      Apply &amp; unlock with M-Pesa
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <a href={mailHref} className="btn-primary inline-flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Apply / enquire</span>
                </a>
              </div>
            )}
          </motion.div>

          {!locked && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-8 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Job description</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">{listing.description}</div>
              </motion.div>

              {listing.requirements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white rounded-xl shadow-lg p-8 mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {listing.requirements.map((req, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="text-primary-600 mt-1">•</span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {listing.benefits.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="bg-white rounded-xl shadow-lg p-8 mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Benefits</h2>
                  <ul className="space-y-3">
                    {listing.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="text-primary-600 mt-1">•</span>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
