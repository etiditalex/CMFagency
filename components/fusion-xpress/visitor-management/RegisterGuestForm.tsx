"use client";

import { useState } from "react";

const inputClass =
  "mt-1.5 w-full min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

export type RegisterGuestPayload = {
  fullName: string;
  phoneNumber: string;
  host: string;
  purposeOfVisit: string;
  visitDate: string;
  visitTime: string;
  idPassportNumber?: string;
  vehiclePlateNumber?: string;
  industrySlug?: string;
};

type RegisterGuestFormProps = {
  defaultIndustrySlug?: string;
  onSubmit: (payload: RegisterGuestPayload) => Promise<void>;
  /** Called after a successful registration (e.g. close modal). */
  onSuccess?: () => void;
  onCancel?: () => void;
};

function todayIso() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowTime() {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

export default function RegisterGuestForm({
  defaultIndustrySlug,
  onSubmit,
  onSuccess,
  onCancel,
}: RegisterGuestFormProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [host, setHost] = useState("");
  const [purposeOfVisit, setPurposeOfVisit] = useState("");
  const [visitDate, setVisitDate] = useState(todayIso);
  const [visitTime, setVisitTime] = useState(nowTime);
  const [idPassportNumber, setIdPassportNumber] = useState("");
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        host: host.trim(),
        purposeOfVisit: purposeOfVisit.trim(),
        visitDate,
        visitTime,
        idPassportNumber: idPassportNumber.trim() || undefined,
        vehiclePlateNumber: vehiclePlateNumber.trim() || undefined,
        industrySlug: defaultIndustrySlug,
      });
      setSuccess("Guest registered. They appear in your visitor list for approval.");
      setFullName("");
      setPhoneNumber("");
      setHost("");
      setPurposeOfVisit("");
      setIdPassportNumber("");
      setVehiclePlateNumber("");
      setVisitDate(todayIso());
      setVisitTime(nowTime());
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not register guest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Guest full name *</span>
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Phone number *</span>
          <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Host / person visiting *</span>
          <input type="text" required value={host} onChange={(e) => setHost(e.target.value)} className={inputClass} placeholder="e.g. Jane Mwangi, Reception" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Purpose of visit *</span>
          <input type="text" required value={purposeOfVisit} onChange={(e) => setPurposeOfVisit(e.target.value)} className={inputClass} placeholder="e.g. Client meeting, delivery" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Visit date *</span>
          <input type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Visit time *</span>
          <input type="time" required value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">ID / passport (optional)</span>
          <input type="text" value={idPassportNumber} onChange={(e) => setIdPassportNumber(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Vehicle plate (optional)</span>
          <input type="text" value={vehiclePlateNumber} onChange={(e) => setVehiclePlateNumber(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
        >
          {loading ? "Saving…" : "Register guest"}
        </button>
      </div>
    </form>
  );
}
