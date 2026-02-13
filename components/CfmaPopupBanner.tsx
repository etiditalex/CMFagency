"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

const POPUP_INTERVAL_MS = 45_000;

export default function CfmaPopupBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const isSuppressedRoute = useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/verify-email") return true;
    if (pathname.startsWith("/dashboard")) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    if (isSuppressedRoute) return;
    // restart timer per page
    setOpen(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), POPUP_INTERVAL_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [isSuppressedRoute]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    // schedule next popup 45s after closing
    if (typeof window !== "undefined") {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setOpen(true), POPUP_INTERVAL_MS);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Upcoming event announcement"
          onMouseDown={(e) => {
            // Click outside to close
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200"
          >
            <button
              onClick={close}
              className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-800" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: image */}
              <div className="relative min-h-[260px] md:min-h-[520px]">
                <div className="absolute inset-0 bg-black" />
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg"
                  alt="Coast Fashion and Modelling Awards 2026 poster"
                  fill
                  className="object-contain object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5" />
                <div className="absolute left-5 bottom-5 right-5">
                  <div className="inline-flex items-center rounded-full bg-secondary-600 text-white px-3 py-1 text-xs font-bold tracking-widest">
                    UPCOMING EVENT
                  </div>
                  <div className="mt-3 text-white text-2xl md:text-3xl font-extrabold drop-shadow">
                    CFMA 2026
                  </div>
                  <div className="mt-1 text-white/90 text-sm font-medium">
                    15th August 2026 • Mombasa, Kenya
                  </div>
                </div>
              </div>

              {/* Right: content */}
              <div className="p-6 md:p-10">
                <div className="text-sm font-bold tracking-widest text-primary-700 uppercase">
                  Coast Fashion & Modelling Awards
                </div>
                <h3 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                  Celebrating Heritage. Empowering Youth Talent.
                </h3>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  Join us for <span className="font-semibold">Coast Fashion and Modelling Awards 2026</span> — advancing
                  sustainable fashion & eco-tourism while spotlighting talent across the Coast.
                </p>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-bold text-gray-900">Theme</div>
                  <div className="mt-1 text-sm text-gray-700">
                    Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism
                  </div>
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/events/upcoming/coast-fashion-modelling-awards-2026"
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 shadow"
                    onClick={close}
                  >
                    View Event Details
                  </Link>
                  <a
                    href="https://forms.gle/GM5fRiutVXko1MaZ9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-5 py-3 shadow"
                    onClick={close}
                  >
                    Partner With Us
                  </a>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <a
                    href="/downloads/sponsorship-proposal-2026.pdf"
                    download
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-5 py-3"
                  >
                    <Download className="h-5 w-5 text-primary-700" />
                    Sponsorship Proposal
                  </a>
                </div>
                <div className="mt-6 text-xs text-gray-500">
                  This banner reappears every 45 seconds. Close it anytime using the <span className="font-semibold">X</span>.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

