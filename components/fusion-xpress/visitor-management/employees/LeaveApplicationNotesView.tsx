"use client";

import { parseLeaveApplicationNotes } from "@/lib/employees/leave-signature";

export default function LeaveApplicationNotesView({ notes }: { notes: string }) {
  const { text, signatureDataUrl } = parseLeaveApplicationNotes(notes);

  if (!text && !signatureDataUrl) return null;

  return (
    <div className="mt-1 space-y-2">
      {text ? <p className="text-xs text-gray-500 whitespace-pre-wrap">{text}</p> : null}
      {signatureDataUrl ? (
        <div className="inline-block rounded border border-gray-200 bg-white p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Digital signature
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureDataUrl}
            alt="Applicant digital signature"
            className="max-h-16 w-auto max-w-[200px]"
          />
        </div>
      ) : null}
    </div>
  );
}
