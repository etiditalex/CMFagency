"use client";

import { QRCodeSVG } from "qrcode.react";

import { receptionGateQrPayload } from "@/lib/employees/reception-gate";
import { crmSiteQrPayload, employeeQrPayload } from "@/lib/employees/utils";

type EmployeeQrCodeProps = {
  token: string;
  size?: number;
  className?: string;
  employeeName?: string;
  /** Reception desk QR encodes gate URL; crm_site is project site GPS visits */
  variant?: "employee" | "gate" | "crm_site";
  showCaption?: boolean;
};

export default function EmployeeQrCode({
  token,
  size = 160,
  className = "",
  employeeName,
  variant = "employee",
  showCaption = true,
}: EmployeeQrCodeProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const value =
    variant === "gate"
      ? receptionGateQrPayload(token, origin)
      : variant === "crm_site"
        ? crmSiteQrPayload(token, origin)
        : employeeQrPayload(token, origin);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <QRCodeSVG value={value} size={size} level="M" includeMargin />
      {showCaption && employeeName ? (
        <span className="text-xs font-semibold text-gray-700 text-center max-w-[12rem]">
          {employeeName}
        </span>
      ) : null}
      {showCaption ? (
        <span className="text-[10px] text-gray-500 font-mono max-w-[10rem] truncate" title={token}>
          {token}
        </span>
      ) : null}
    </div>
  );
}
