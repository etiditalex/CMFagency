"use client";

import Link from "next/link";
import { Briefcase, MapPin, Calendar, ArrowLeft, Mail, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatEmploymentType } from "@/lib/job-board-access";
import { industryLabel, seniorityLabel } from "@/lib/job-listing-taxonomy";
import type { EmployerJobListing } from "@/lib/job-board-server";

type Props = {
  initial: EmployerJobListing;
};

export default function JobDetailClient({ initial }: Props) {
  const [listing, setListing] = useState(initial);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    setListing(initial);
  }, [initial]);

  useEffect(() => {
    if (!initial.locked) return;

    let cancelled = false;
    (async () => {
      setUnlocking(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const res = await fetch(`/api/job-board/listings/${encodeURIComponent(initial.id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || j.locked === true) return;

        const L = j.listing;
        if (!L || typeof L !== "object") return;

        setListing((prev) => ({
          ...prev,
          locked: false,
          lock_message: null,
          description: String(L.description ?? ""),
          requirements: Array.isArray(L.requirements) ? L.requirements.map(String) : [],
          benefits: Array.isArray(L.benefits) ? L.benefits.map(String) : [],
          contact_email: L.contact_email != null ? String(L.contact_email) : null,
          summary: L.summary != null ? String(L.summary) : prev.summary,
        }));
      } finally {
        if (!cancelled) setUnlocking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial.id, initial.locked]);

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
          <div className="mb-6">
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </Link>
          </div>

          {listing.poster_url && (
            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md bg-gray-100 aspect-[21/9] max-h-[min(40vh,420px)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and arbitrary hosts */}
              <img
                src={listing.poster_url}
                alt={`${listing.title} at ${listing.company_name}`}
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="w-6 h-6 text-primary-600 shrink-0" />
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
              {industryLabel(listing.industry) && (
                <div className="flex items-start text-gray-600 md:col-span-2">
                  <span className="font-semibold text-gray-700 mr-2 shrink-0">Industry:</span>
                  <span>{industryLabel(listing.industry)}</span>
                </div>
              )}
              {seniorityLabel(listing.seniority) && (
                <div className="flex items-center text-gray-600">
                  <span className="font-semibold text-gray-700 mr-2">Level:</span>
                  <span>{seniorityLabel(listing.seniority)}</span>
                </div>
              )}
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

            {listing.locked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-amber-950">
                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Members only</p>
                  <p className="text-sm mt-1">{listing.lock_message}</p>
                  {unlocking && (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-amber-900">
                      <Loader2 className="w-4 h-4 animate-spin" /> Checking membership…
                    </p>
                  )}
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
          </div>

          {listing.summary && listing.locked && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-700 whitespace-pre-line">{listing.summary}</p>
            </div>
          )}

          {!listing.locked && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Job description</h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-line">{listing.description}</div>
              </div>

              {listing.requirements.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {listing.requirements.map((req, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="text-primary-600 mt-1">•</span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {listing.benefits.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Benefits</h2>
                  <ul className="space-y-3">
                    {listing.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="text-primary-600 mt-1">•</span>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
