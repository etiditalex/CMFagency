"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

/**
 * Fusion Xpress (Portal Login)
 * -----------------------------------------------------------------------------
 * Marketing landing + portal sign-in. Employers normally sign in from /jobs (For employers).
 * Same auth stack: Supabase + portal_members + 2FA APIs.
 */
export default function FusionXpressAdminLoginPage() {
  const sp = useSearchParams();
  const initialErrorKey = sp?.get("error") ?? null;
  const fromEmployer = sp?.get("from") === "employer";

  const initialErrorMessage = useMemo(() => {
    if (initialErrorKey === "unauthorized") {
      return "Access denied. Hiring managers can register from the job board under “For employers”, then sign in there or here. Otherwise ask an admin to add your account to the portal.";
    }
    if (initialErrorKey === "setup") {
      return "Fusion Xpress portal is not configured yet. Run the database setup SQL in Supabase.";
    }
    return null;
  }, [initialErrorKey]);

  return (
    <div className="min-h-screen pt-28 md:pt-32 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <section className="text-left">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 min-h-[320px] md:min-h-[380px]">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-500/15 blur-3xl" />
              <div className="absolute bottom-8 -right-24 w-80 h-80 rounded-full bg-secondary-500/15 blur-3xl" />
            </div>

            <div className="relative p-6 md:p-10">
              <div className="max-w-4xl">
                <h1 className="mt-5 text-4xl md:text-5xl font-extrabold text-white leading-tight text-left drop-shadow-lg">
                  Changer Fusions helps creators run unforgettable experiences.
                </h1>
                <p className="mt-4 text-white/95 leading-relaxed max-w-3xl drop-shadow-md">
                  We support event organizers, artists, talent brands, and entertainment businesses with campaign setup,
                  ticketing, voting programs, and marketing execution—built to be simple for audiences and reliable for
                  admins.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Experiences</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Ticketing</div>
              <div className="mt-2 text-sm text-gray-600">For Events, Shows & Launches</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Gate team upon request",
                  "4% of revenue (Revenue > KSh 1,000,000)",
                  "5% of revenue (Revenue <= KSh 1,000,000)",
                  "Send emails to attendees",
                  "Add coupons to tickets",
                  "Add managers to your experience",
                  "Payouts on request",
                  "Dedicated support personnel",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Voting Programs</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Voting</div>
              <div className="mt-2 text-sm text-gray-600">For Paid Voting Programs</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Dedicated support personnel",
                  "20% of revenue (Revenue > KSh 1,000,000)",
                  "30% of revenue (Revenue <= KSh 1,000,000)",
                  "Send emails to contestants",
                  "Unlimited categories",
                  "Unlimited contestants",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Premium</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Custom</div>
              <div className="mt-2 text-sm text-gray-600">Ideal for Businesses & Companies</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Custom workflows and reporting",
                  "Security-first admin access control",
                  "Support with go-live + monitoring",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black transition-colors"
                >
                  Talk to sales
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-secondary-200 bg-gradient-to-r from-secondary-50 via-white to-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 md:p-10 items-center">
              <div className="lg:col-span-3">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                  The most
                  <br />
                  affordable prices
                  <br />
                  in Kenya
                </h2>
                <div className="mt-4 font-extrabold text-gray-900">Contracts, No monthly fees, no worries</div>
                <p className="mt-3 text-gray-600 leading-relaxed max-w-xl">
                  Our fees are affordable and make sense. We only charge when you successfully sell tickets or collect paid
                  votes—so you can launch confidently and scale as your audience grows.
                </p>
              </div>

              <div className="lg:col-span-2">
                <div className="w-full max-w-sm lg:ml-auto rounded-2xl bg-secondary-900 text-white p-8 shadow-lg">
                  <div className="mx-auto w-28 h-28 rounded-full border-2 border-white/70 flex items-center justify-center">
                    <div className="text-5xl font-extrabold">5%</div>
                  </div>
                  <div className="mt-5 font-extrabold text-lg">Per ticket sold</div>
                  <div className="mt-1 text-sm text-white/80">Includes payment processing fees and webhook verification.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="text-2xl md:text-3xl font-extrabold text-secondary-800 text-left">Payments to Organisers</div>
            <p className="mt-4 text-gray-600 leading-relaxed">
              In terms of event funds payout, we try to make it as much pleasing for the Organiser as for the ticket buyer in
              cases where the event might be canceled. Funds are available for withdrawal to organisers as soon as 2 days from
              whenever the event is published. The organiser is able to withdraw any amount he/she needs at any time for a maximum
              of once a day until the experience is over, any pending balance shall be settled by Changer Fusions and an experience
              report will be shared with the organiser. This however means that Changer Fusions shall not be liable for any
              refunds and incase of event cancellation the organiser shall be fully liable to reimburse customers/ticket buyers as
              per contract statements.
            </p>
          </div>
        </section>

        <section className="mt-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-primary-700 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>

            <PortalLoginForm
              initialErrorMessage={initialErrorMessage}
              showEmployerBanner={fromEmployer}
              layout="standalone"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
