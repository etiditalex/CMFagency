"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  /** When this becomes true after payment is processed, the toast appears. */
  show: boolean;
  /** Auto-hide after this many ms (default 7000). Use 0 to only dismiss manually. */
  durationMs?: number;
};

export default function VoteSuccessToast({ show, durationMs = 7000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (durationMs <= 0) return;
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [show, durationMs]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-20 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 print:hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900">Your vote was successful</p>
          <p className="mt-0.5 text-sm text-gray-600">
            Payment is confirmed and your votes are being counted. Thank you for voting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
