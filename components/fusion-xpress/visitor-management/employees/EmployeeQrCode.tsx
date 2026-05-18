"use client";

import { QRCodeSVG } from "qrcode.react";

import { employeeQrPayload } from "@/lib/employees/utils";

type EmployeeQrCodeProps = {
  token: string;
  size?: number;
  className?: string;
  employeeName?: string;
};

export default function EmployeeQrCode({
  token,
  size = 160,
  className = "",
  employeeName,
}: EmployeeQrCodeProps) {
  const value =
    typeof window !== "undefined"
      ? employeeQrPayload(token, window.location.origin)
      : employeeQrPayload(token);

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <QRCodeSVG value={value} size={size} level="M" includeMargin />
      {employeeName ? (
        <span className="text-xs font-semibold text-gray-700 text-center max-w-[12rem]">
          {employeeName}
        </span>
      ) : null}
      <span className="text-[10px] text-gray-500 font-mono max-w-[10rem] truncate" title={token}>
        {token}
      </span>
    </div>
  );
}
