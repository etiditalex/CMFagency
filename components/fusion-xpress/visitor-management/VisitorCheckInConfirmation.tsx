"use client";

import { useState } from "react";
import { Check, ChevronRight, Download, LogOut, User } from "lucide-react";

export type CheckInSession = {
  visitorId: string;
  venueName: string;
  visitorName: string;
  checkedInAt: string;
  timeLabel: string;
  dateLabel: string;
  emailSent?: boolean;
};

type VisitorCheckInConfirmationProps = {
  session: CheckInSession;
  onCheckOut?: () => Promise<void>;
  onRegisterAnother?: () => void;
};

export default function VisitorCheckInConfirmation({
  session,
  onCheckOut,
  onRegisterAnother,
}: VisitorCheckInConfirmationProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckOut = async () => {
    if (!onCheckOut || checkedOut) return;
    setCheckingOut(true);
    setError(null);
    try {
      await onCheckOut();
      setCheckedOut(true);
      setCheckOutTime(
        new Date().toLocaleTimeString("en-KE", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not check out");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
          <Check className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">{session.venueName}</p>
        {checkedOut ? (
          <>
            <p className="mt-2 text-4xl font-bold tracking-tight text-primary-600">
              {checkOutTime ?? "—"}
            </p>
            <p className="mt-1 text-sm text-gray-500">Checked out</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-4xl font-bold tracking-tight text-primary-600">
              {session.timeLabel}
            </p>
            {session.dateLabel ? (
              <p className="mt-1 text-sm text-gray-500">Checked in on {session.dateLabel}</p>
            ) : null}
          </>
        )}
        {session.emailSent ? (
          <p className="mt-3 text-xs font-medium text-secondary-700">Confirmation email sent</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white">
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-900">1 People</p>
            <p className="truncate text-sm text-gray-500">{session.visitorName}</p>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white">
            <Download className="h-4 w-4" />
          </span>
          Download Confirmation
        </button>
        {onRegisterAnother ? (
          <button
            type="button"
            onClick={onRegisterAnother}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white text-lg leading-none">
                +
              </span>
              Check in new visitors
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!checkedOut && onCheckOut && session.visitorId ? (
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={checkingOut}
          className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-primary-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          <LogOut className="mr-2 h-5 w-5" />
          {checkingOut ? "Checking out…" : "Check Out"}
        </button>
      ) : null}
    </div>
  );
}
