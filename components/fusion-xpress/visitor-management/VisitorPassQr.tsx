"use client";

import { QRCodeSVG } from "qrcode.react";

import { visitorArrivalQrPayload } from "@/lib/visitors/preregistration";

type VisitorPassQrProps = {
  token?: string | null;
  gateToken?: string | null;
  size?: number;
  label?: string;
  className?: string;
};

export default function VisitorPassQr({
  token,
  gateToken,
  size = 180,
  label,
  className = "",
}: VisitorPassQrProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const value = token
    ? visitorArrivalQrPayload({ token, siteOrigin: origin })
    : gateToken
      ? visitorArrivalQrPayload({ gate: gateToken, siteOrigin: origin })
      : "";

  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="border border-[#e5e5e5] bg-white p-3">
        <QRCodeSVG value={value} size={size} level="M" includeMargin />
      </div>
      {label ? (
        <span className="max-w-[14rem] text-center text-xs font-semibold text-gray-700">{label}</span>
      ) : null}
    </div>
  );
}
