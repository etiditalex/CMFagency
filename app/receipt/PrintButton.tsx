"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-br from-[#D4AF37] to-[#B8860B] hover:opacity-90 shadow"
    >
      Print / Save as PDF
    </button>
  );
}
