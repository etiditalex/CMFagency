"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const POSTER_SRC =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791017679/WhatsApp_Image_2026-09-28_at_13.14.45_tlcdsu.jpg";
const REGISTER_HREF = "/kcm/kenya-coast-models";
const REPEAT_MS = 60_000;
const OPEN_DELAY_MS = 500;

function isInternalRoute(pathname: string) {
  const blocked = [
    "/dashboard",
    "/fusion-xpress",
    "/verify-email",
    "/login",
    "/app",
    "/teams-work",
    "/invoice",
    "/kcm/member-portal",
    "/gate",
  ];
  return blocked.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function KenyaCoastModelsPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const repeatTimer = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const clearTimers = useCallback(() => {
    if (repeatTimer.current) window.clearTimeout(repeatTimer.current);
    if (openTimer.current) window.clearTimeout(openTimer.current);
    repeatTimer.current = null;
    openTimer.current = null;
  }, []);

  const scheduleOpen = useCallback((delay: number) => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), delay);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (repeatTimer.current) window.clearTimeout(repeatTimer.current);
    repeatTimer.current = window.setTimeout(() => setOpen(true), REPEAT_MS);
  }, []);

  useEffect(() => {
    clearTimers();
    setOpen(false);

    if (!pathname || pathname === REGISTER_HREF || isInternalRoute(pathname)) {
      return;
    }

    scheduleOpen(OPEN_DELAY_MS);
    return clearTimers;
  }, [pathname, clearTimers, scheduleOpen]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Kenya Coast Models forum registration"
    >
      <div className="absolute inset-0 bg-black/75" onMouseDown={dismiss} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col items-center">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={dismiss}
          className="absolute -right-1 -top-1 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-black/10 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:-right-3 sm:-top-3"
          aria-label="Cancel poster"
        >
          <X className="h-5 w-5" />
        </button>

        <Link
          href={REGISTER_HREF}
          className="block w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Register for the Kenya Coast Models forum"
        >
          <Image
            src={POSTER_SRC}
            alt="Sustainable Fashion and Models Empowerment Forum poster. Click to register."
            width={900}
            height={1200}
            priority
            className="h-auto max-h-[78vh] w-full object-contain bg-white"
          />
        </Link>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
