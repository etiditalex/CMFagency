"use client";

import { qrGridFromToken } from "@/lib/visitors/utils";

type MockQrCodeProps = {
  token: string;
  size?: number;
  className?: string;
  label?: string;
};

export default function MockQrCode({ token, size = 21, className = "", label }: MockQrCodeProps) {
  const grid = qrGridFromToken(token, size);
  const cell = 100 / size;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-md border border-gray-200 bg-white p-1"
        role="img"
        aria-label={label ?? `QR pass for ${token}`}
      >
        <rect width="100" height="100" fill="#ffffff" />
        {grid.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect
                key={`${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#111827"
              />
            ) : null
          )
        )}
      </svg>
      {label ? <span className="text-[10px] text-gray-500 font-mono max-w-[5rem] truncate">{label}</span> : null}
    </div>
  );
}
