"use client";

import { QRCodeSVG } from "qrcode.react";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { formatKcmIssuedDate, type KcmMembershipCardData } from "@/lib/kcm-membership-card";

const labelStyle = {
  textTransform: "none" as const,
  letterSpacing: "0.01em",
};

export function KcmMembershipCard({
  card,
  qrValue,
}: {
  card: KcmMembershipCardData;
  qrValue: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl bg-secondary-800 px-4 py-5 text-white shadow-lg sm:rounded-[28px] sm:px-8 sm:py-7">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 text-left">
          <p
            className="text-left text-[11px] font-semibold tracking-[0.12em] text-white/80 sm:text-xs sm:tracking-[0.16em]"
            style={labelStyle}
          >
            Kenya Coast Models
          </p>
          <h2 className="mt-2 break-words text-left text-2xl font-bold leading-tight text-white sm:text-4xl">
            {card.fullName}
          </h2>
        </div>
        <div className="shrink-0 rounded-xl bg-white p-1.5 sm:rounded-2xl sm:p-2">
          <span className="sm:hidden">
            <QRCodeSVG value={qrValue} size={68} level="M" bgColor="#ffffff" fgColor="#14523a" />
          </span>
          <span className="hidden sm:inline-block">
            <QRCodeSVG value={qrValue} size={92} level="M" bgColor="#ffffff" fgColor="#14523a" />
          </span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 text-left sm:mt-8 sm:gap-x-6 sm:gap-y-5">
        <div className="min-w-0">
          <dt className="text-left text-xs text-white/75 sm:text-sm">Member ID</dt>
          <dd className="mt-0.5 break-words text-left text-base font-bold sm:text-lg">{card.membershipNumber}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-left text-xs text-white/75 sm:text-sm">Category</dt>
          <dd className="mt-0.5 break-words text-left text-base font-bold sm:text-lg">{card.category}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-left text-xs text-white/75 sm:text-sm">Contact</dt>
          <dd className="mt-0.5 break-words text-left text-base font-bold sm:text-lg">{card.contact}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-left text-xs text-white/75 sm:text-sm">Email</dt>
          <dd className="mt-0.5 break-all text-left text-base font-bold sm:text-lg">{card.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-left text-xs text-white/75 sm:text-sm">Issued</dt>
          <dd className="mt-0.5 break-words text-left text-base font-bold sm:text-lg">{formatKcmIssuedDate(card.issuedOn)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 sm:mt-8">
        <div className="inline-flex items-center rounded-2xl bg-white px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_URL} alt="Changer Fusions" className="h-8 w-auto sm:h-10" />
        </div>
        <span className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-secondary-800">
          Approved
        </span>
      </div>
    </article>
  );
}
