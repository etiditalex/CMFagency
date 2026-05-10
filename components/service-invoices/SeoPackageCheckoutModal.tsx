"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  packageId: string;
  packageTitle: string;
  amountKes: number;
};

export default function SeoPackageCheckoutModal({ open, onClose, packageId, packageTitle, amountKes }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/service-invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: packageId,
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || undefined,
          customer_company: company.trim() || undefined,
          customer_address: address.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        view_url?: string;
        access_token?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not create invoice");
      const url = json.view_url ?? (json.access_token ? `/invoice/${json.access_token}` : "");
      if (!url) throw new Error("Missing invoice link");
      window.location.href = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-secondary-600">Checkout</div>
            <h2 className="mt-1 text-lg font-extrabold text-gray-900">{packageTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">
              KSh {amountKes.toLocaleString("en-KE")} <span className="text-gray-400">/ month</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Your name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700">Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="254712345678"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700">Company (optional)</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700">Billing address (optional)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <p className="text-xs text-gray-500">
            We&apos;ll email you a proforma invoice with a secure link to pay anytime via Paystack or M-Pesa.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn-secondary flex-1 rounded-lg py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
