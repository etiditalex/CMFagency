"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, LucideIcon, Mail, Phone } from "lucide-react";
import Link from "next/link";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  intro: string;
  positions: string[];
  requirements: string[];
  icon: LucideIcon;
  extraNote?: ReactNode;
};

/**
 * Full fallback when a career track page is not yet filled from the CMS —
 * avoids thin "coming soon" copy for crawlers and applicants.
 */
export function CareerTrackJobsFallback({
  backHref,
  backLabel,
  title,
  subtitle,
  intro,
  positions,
  requirements,
  icon: Icon,
  extraNote,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-accent-600 via-accent-700 to-primary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              href={backHref}
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Icon className="h-6 w-6 text-white" />
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{title}</h1>
            <p className="text-xl md:text-2xl text-white/90">{subtitle}</p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About this track</h2>
            <p className="text-gray-700 mb-6">{intro}</p>
            {extraNote ? <div className="text-gray-700 mb-8">{extraNote}</div> : null}

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Roles we often hire for</h3>
            <p className="text-gray-700 mb-4">
              Open requisitions change with client workload. The list below describes typical titles—we may combine duties
              in one role or split them across contractors. Live vacancies also appear on our public{" "}
              <Link href="/jobs" className="font-semibold text-accent-600 underline hover:text-accent-700">
                job board
              </Link>
              .
            </p>
            <ul className="space-y-3 mb-8">
              {positions.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-accent-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">General expectations</h3>
            <ul className="space-y-3 mb-8">
              {requirements.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-accent-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to apply</h3>
              <p className="text-gray-700 mb-4">
                Send a CV and a short note on availability to our talent inbox, or apply through an active post on the job
                board. We respond to serious applications and may invite you for a brief culture and skills conversation
                before any offer.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:info@cmfagency.co.ke"
                  className="flex items-center text-accent-600 hover:text-accent-700 font-semibold"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  info@cmfagency.co.ke
                </a>
                <a
                  href="tel:+254797777347"
                  className="flex items-center text-accent-600 hover:text-accent-700 font-semibold"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  +254 797 777347
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
