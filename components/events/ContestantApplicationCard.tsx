"use client";

import { QRCodeSVG } from "qrcode.react";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  IDEAL_EVENT_DATE_LABEL,
  IDEAL_EVENT_VENUE,
  categoryLabel,
  formatIssuedDate,
  titleLabel,
  type ContestantCardData,
} from "@/lib/ideal-mr-miss";

const labelStyle = {
  textTransform: "none" as const,
  letterSpacing: "0.01em",
};

export function ContestantApplicationCard({
  card,
  qrValue,
}: {
  card: ContestantCardData;
  qrValue: string;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] bg-secondary-800 px-6 py-6 text-white shadow-lg sm:px-8 sm:py-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 text-left">
          <p className="text-left text-xs font-semibold tracking-[0.16em] text-white/80" style={labelStyle}>
            Kenya’s Ideal Mr &amp; Miss
          </p>
          <h2 className="mt-2 text-left text-3xl font-bold leading-tight text-white sm:text-4xl">{card.fullName}</h2>
        </div>
        <div className="shrink-0 rounded-2xl bg-white p-2">
          <QRCodeSVG value={qrValue} size={92} level="M" bgColor="#ffffff" fgColor="#14523a" />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-left">
        <div>
          <dt className="text-left text-sm text-white/75">Application no.</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{card.applicationCode}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Title</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{titleLabel(card.applyingAs)}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Category</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{categoryLabel(card.category)}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Town and county</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{card.townCounty}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Venue</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{IDEAL_EVENT_VENUE}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Event date</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{IDEAL_EVENT_DATE_LABEL}</dd>
        </div>
        <div>
          <dt className="text-left text-sm text-white/75">Issued</dt>
          <dd className="mt-0.5 text-left text-lg font-bold">{formatIssuedDate(card.issuedOn)}</dd>
        </div>
      </dl>

      <div className="mt-8 flex items-end justify-between gap-3">
        <div className="inline-flex items-center rounded-2xl bg-white px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_URL} alt="Changer Fusions" className="h-10 w-auto" />
        </div>
        <span className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-secondary-800">
          Applied
        </span>
      </div>
    </article>
  );
}
