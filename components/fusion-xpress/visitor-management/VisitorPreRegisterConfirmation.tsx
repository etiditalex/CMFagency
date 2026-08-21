"use client";

import { Check, QrCode, Smartphone } from "lucide-react";

import VisitorPassQr from "@/components/fusion-xpress/visitor-management/VisitorPassQr";

export type PreRegisterSession = {
  visitorId: string;
  venueName: string;
  visitorName: string;
  visitDate: string;
  qrToken: string | null;
  passUrl: string;
  emailSent?: boolean;
  deviceLabel?: string | null;
};

type VisitorPreRegisterConfirmationProps = {
  session: PreRegisterSession;
  onRegisterAnother?: () => void;
};

function formatVisitDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VisitorPreRegisterConfirmation({
  session,
  onRegisterAnother,
}: VisitorPreRegisterConfirmationProps) {
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
          <Check className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">{session.venueName}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-primary-800">
          Pre-registered
        </p>
        <p className="mt-1 text-sm text-gray-500">{formatVisitDate(session.visitDate)}</p>
        <p className="mt-3 text-sm font-semibold text-gray-900">{session.visitorName}</p>
        {session.deviceLabel ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
            <Smartphone className="h-3.5 w-3.5" />
            Bound to this {session.deviceLabel.toLowerCase()}
          </p>
        ) : null}
        {session.emailSent ? (
          <p className="mt-3 text-xs font-medium text-secondary-700">Confirmation email sent</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-gray-900">
          <QrCode className="h-4 w-4 text-primary-700" />
          Your arrival pass
        </p>
        {session.qrToken ? (
          <VisitorPassQr token={session.qrToken} label="Scan this at reception, or scan the posted QR with this phone." />
        ) : (
          <p className="text-sm text-gray-600">
            At the premise, scan the reception QR code with this same phone.
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Use the same phone and contact number from this form. Reception verifies the scan against
          the device and number stored at pre-registration.
        </p>
      </div>

      {onRegisterAnother ? (
        <button
          type="button"
          onClick={onRegisterAnother}
          className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Register another visitor
        </button>
      ) : null}
    </div>
  );
}
