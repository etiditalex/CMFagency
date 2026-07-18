"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  mode: "enroll" | "verify";
  disabled?: boolean;
  pressesRequired?: number;
  onComplete: () => void;
  label?: string;
};

export default function FingerprintPad({
  mode,
  disabled = false,
  pressesRequired,
  onComplete,
  label,
}: Props) {
  const needed = pressesRequired ?? (mode === "enroll" ? 3 : 1);
  const [presses, setPresses] = useState(0);
  const [pressing, setPressing] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setPresses(0);
    completedRef.current = false;
  }, [mode, needed, disabled]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const progress = Math.min(1, presses / needed);
  const ready = presses >= needed;

  const startPress = () => {
    if (disabled || ready || completedRef.current) return;
    setPressing(true);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      setPressing(false);
      setPresses((prev) => {
        const next = prev + 1;
        if (next >= needed && !completedRef.current) {
          completedRef.current = true;
          queueMicrotask(() => onComplete());
        }
        return next;
      });
    }, mode === "enroll" ? 700 : 550);
  };

  const endPress = () => {
    setPressing(false);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled || ready}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        className={`relative flex h-44 w-44 items-center justify-center rounded-full border-2 transition select-none touch-none ${
          disabled
            ? "border-gray-200 bg-gray-50 opacity-60"
            : ready
              ? "border-emerald-500 bg-emerald-50"
              : pressing
                ? "border-sky-600 bg-sky-100 scale-[0.98]"
                : "border-sky-300 bg-gradient-to-b from-sky-50 to-white hover:border-sky-500"
        }`}
        aria-label={label ?? (mode === "enroll" ? "Enroll fingerprint" : "Scan fingerprint")}
      >
        <svg viewBox="0 0 120 120" className="h-28 w-28 text-sky-700" aria-hidden>
          <path
            d="M60 18c-18 0-32 14-32 34v8c0 22 10 38 24 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={0.35 + progress * 0.65}
          />
          <path
            d="M60 28c-12 0-22 10-22 24v6c0 16 7 28 18 38"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={0.3 + progress * 0.7}
          />
          <path
            d="M60 38c-7 0-12 6-12 14v4c0 10 4 18 10 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={0.25 + progress * 0.75}
          />
          <path
            d="M68 42c4 2 7 7 7 14v3c0 9-3 16-8 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={0.2 + progress * 0.8}
          />
          <circle
            cx="60"
            cy="58"
            r="6"
            fill="currentColor"
            opacity={pressing || ready ? 0.85 : 0.35}
          />
        </svg>
        <span
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: pressing ? "inset 0 0 0 6px rgba(2,132,199,0.25)" : undefined,
          }}
        />
      </button>
      <p className="text-center text-sm text-gray-600">
        {ready
          ? mode === "enroll"
            ? "Fingerprint captured"
            : "Fingerprint recognised"
          : mode === "enroll"
            ? `Hold finger on the pad (${presses}/${needed})`
            : "Place enrolled finger on the pad and hold"}
      </p>
      {label ? <p className="text-xs font-semibold text-sky-800">{label}</p> : null}
    </div>
  );
}
