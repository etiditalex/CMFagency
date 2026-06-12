"use client";

import { Download } from "lucide-react";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  label?: string;
};

export default function SummaryReportExcelButton({
  disabled = false,
  loading = false,
  onClick,
  label = "Download Excel",
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => void onClick()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50 print:hidden"
    >
      <Download className="w-3.5 h-3.5" aria-hidden />
      {loading ? "Exporting…" : label}
    </button>
  );
}
