"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  getSmartManagementInvoiceFeatures,
  smartManagementPackageLabel,
} from "@/lib/visitors/smart-management-invoice-features";
import type { PaidVisitorPlan } from "@/lib/visitors/subscription-pricing";
import { supabase } from "@/lib/supabase";

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const q = /filename="([^"]+)"/i.exec(header);
  if (q?.[1]) return q[1];
  return null;
}

export default function SmartManagementInvoicePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isEmployer } = usePortal();

  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToPhone, setBillToPhone] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [plan, setPlan] = useState<PaidVisitorPlan>("professional");
  const [totalAmountKes, setTotalAmountKes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "cash_or_mpesa">("cash");
  const [notes, setNotes] = useState(
    "Lifetime access to Fusion Xpress Smart Visitor Management for the selected package."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (isEmployer) {
      router.replace("/dashboard");
    }
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isEmployer, router, user]);

  const features = useMemo(() => getSmartManagementInvoiceFeatures(plan), [plan]);

  const totalParsed = useMemo(() => {
    const n = Math.round(Number(totalAmountKes));
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }, [totalAmountKes]);

  const canSubmit = Boolean(billToName.trim() && totalParsed != null);

  const onGenerate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      if (totalParsed == null) throw new Error("Enter a valid total amount in KSh.");

      const res = await fetch("/api/fusion-xpress/smart-management-invoice/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billToName: billToName.trim(),
          billToEmail: billToEmail.trim() || undefined,
          billToPhone: billToPhone.trim() || undefined,
          billToAddress: billToAddress.trim() || undefined,
          plan,
          totalAmountKes: totalParsed,
          dueDateIso: dueDate.trim() || null,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Could not generate invoice");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        parseFilenameFromDisposition(res.headers.get("Content-Disposition")) ??
        "smart-management-invoice.pdf";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || portalLoading || !isAuthenticated || !isPortalMember || isEmployer) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Generate a <span className="font-semibold text-gray-800">Smart Management Invoice</span> for clients
          buying a <span className="font-semibold text-gray-800">lifetime</span> Fusion Xpress Visitor Management
          package (Professional or Enterprise), typically paid in cash. The PDF lists all included features and
          shows only the total amount — no per-feature prices.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start border border-gray-100 rounded-lg p-4 bg-gray-50/80">
        <div className="shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm relative h-14 w-[200px]">
          <Image src={BRAND_LOGO_URL} alt="Changer Fusions" fill className="object-contain p-1" sizes="200px" />
        </div>
        <div className="text-sm text-gray-700 leading-relaxed min-w-0">
          <div className="font-bold text-gray-900">Changer Fusions · Fusion Xpress</div>
          <div>Ambalal Building, Nkruma Road · Ambalal, Mombasa, Kenya</div>
          <div className="mt-1 text-gray-500">
            Document title on the PDF: Smart Management Invoice. Amounts in KSh.
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Bill to name *</label>
            <input
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
              placeholder="e.g. Acme Properties Ltd"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Email</label>
            <input
              type="email"
              value={billToEmail}
              onChange={(e) => setBillToEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Phone</label>
            <input
              value={billToPhone}
              onChange={(e) => setBillToPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Address</label>
            <textarea
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Package *</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["professional", "enterprise"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                    plan === p
                      ? "border-primary-600 bg-primary-50 text-primary-900"
                      : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {smartManagementPackageLabel(p)} · Lifetime
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
              Total amount (KSh) *
            </label>
            <input
              value={totalAmountKes}
              onChange={(e) => setTotalAmountKes(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 150000"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Set the agreed lifetime price. Only this total appears on the PDF (no line-item amounts).
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "cash" | "mpesa" | "cash_or_mpesa")
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa Paybill</option>
              <option value="cash_or_mpesa">Cash or M-Pesa</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" aria-hidden />
          Included features — {smartManagementPackageLabel(plan)}
        </h2>
        <p className="mt-1 text-xs text-gray-500">These appear on the PDF without individual prices.</p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 text-sm text-gray-800">
          {features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-primary-600 shrink-0">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {totalParsed != null ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-gray-700">Total on invoice</span>
            <span className="text-lg font-extrabold tabular-nums text-gray-900">
              KSh {totalParsed.toLocaleString("en-KE")}
            </span>
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => void onGenerate()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-700 to-secondary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Download PDF
        </button>
        {!canSubmit ? (
          <span className="text-xs text-gray-500">Enter bill-to name and a total amount.</span>
        ) : null}
      </div>
    </div>
  );
}
