"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronDown } from "lucide-react";

const sponsorOptions = [
  { label: "High fashion model / showcase model", href: "https://forms.gle/vDySg2WJyUZ621EA7" },
  { label: "Award contender / competing model or designer", href: "https://forms.gle/GM5fRiutVXko1MaZ9" },
  { label: "Designer", href: "https://forms.gle/Rs1YyH1aGzfXeqE8A" },
  { label: "Volunteer", href: "https://forms.gle/DKvcV6g9ecjmsbwC8" },
  { label: "Creative art performance / entertainment", href: "https://forms.gle/DaagrPhqGMtTz3vr7" },
];

export default function SponsorDropdown({
  buttonClassName,
  buttonIconClassName,
  buttonTextClassName,
  buttonLabel = "Participate as",
  menuAlign = "left",
}: {
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonTextClassName?: string;
  buttonLabel?: string;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BadgeCheck className={buttonIconClassName ?? "w-5 h-5"} />
        <span className={buttonTextClassName}>{buttonLabel}</span>
        <ChevronDown className="w-5 h-5 opacity-90" />
      </button>
      {open && (
        <div
          role="menu"
          className={[
            "absolute z-30 mt-2 w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl",
            menuAlign === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Register as</div>
          </div>
          <div className="py-1">
            {sponsorOptions.map((opt) => (
              <a
                key={opt.label}
                role="menuitem"
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </a>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <a
              role="menuitem"
              href="https://forms.gle/GM5fRiutVXko1MaZ9"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-sm font-extrabold text-primary-700 hover:bg-primary-50"
              onClick={() => setOpen(false)}
            >
              Register Interest
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
