"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";

import RegisterGuestForm, {
  type RegisterGuestPayload,
} from "@/components/fusion-xpress/visitor-management/RegisterGuestForm";

type RegisterGuestModalProps = {
  open: boolean;
  onClose: () => void;
  defaultIndustrySlug?: string;
  onSubmit: (payload: RegisterGuestPayload) => Promise<void>;
};

export default function RegisterGuestModal({
  open,
  onClose,
  defaultIndustrySlug,
  onSubmit,
}: RegisterGuestModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-guest-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[min(92vh,720px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 id="register-guest-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-600 flex-shrink-0" />
              Register a guest
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manual registration for reception or staff. Guests can also check in via your QR welcome screen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-6 py-4">
          <RegisterGuestForm
            key={defaultIndustrySlug}
            defaultIndustrySlug={defaultIndustrySlug}
            onSubmit={onSubmit}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
