"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { INVOICE_MPESA_ACCOUNT, INVOICE_MPESA_PAYBILL } from "@/lib/invoice-payment-details";
import { supabase } from "@/lib/supabase";

type Line = {
  id: string;
  description: string;
  quantity: string;
  unitAmountKes: string;
  amountPaidKes: string;
};

function newLine(): Line {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    description: "",
    quantity: "1",
    unitAmountKes: "",
    amountPaidKes: "",
  };
}

function lineRowTotalKes(qtyStr: string, unitStr: string): number | null {
  const q = Number(qtyStr);
  const u = Number(unitStr);
  if (!Number.isFinite(q) || q <= 0) return null;
  if (!Number.isFinite(u) || u < 0) return null;
  return Math.round(q * Math.round(u));
}

function todayIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

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

export default function DashboardReceiptsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isEmployer } = usePortal();

  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToPhone, setBillToPhone] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [relatedInvoice, setRelatedInvoice] = useState("");
  const [receiptDate, setReceiptDate] = useState(todayIsoDate);
  const [paymentDate, setPaymentDate] = useState(todayIsoDate);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("M-Pesa transfer");
  const [mpesaReference, setMpesaReference] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [balanceDueDays, setBalanceDueDays] = useState("14");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);

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

  const invoiceTotalKes = useMemo(() => {
    let grand = 0;
    for (const r of lines) {
      if (!r.description.trim()) continue;
      const lt = lineRowTotalKes(r.quantity, r.unitAmountKes);
      if (lt == null) continue;
      grand += lt;
    }
    return grand;
  }, [lines]);

  const amountPaidKes = useMemo(() => {
    const n = Number(amountPaid);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }, [amountPaid]);

  const balanceDueKes = amountPaidKes == null ? invoiceTotalKes : Math.max(0, invoiceTotalKes - amountPaidKes);

  const canSubmit = useMemo(() => {
    if (!billToName.trim()) return false;
    if (amountPaidKes == null) return false;
    if (amountPaidKes > invoiceTotalKes) return false;
    return lines.some(
      (r) =>
        r.description.trim() &&
        Number(r.quantity) > 0 &&
        Number.isFinite(Number(r.unitAmountKes)) &&
        Number(r.unitAmountKes) >= 0
    );
  }, [billToName, lines, amountPaidKes, invoiceTotalKes]);

  const addRow = () => setLines((prev) => [...prev, newLine()]);
  const removeRow = (id: string) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
  const updateLine = (id: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const onGenerate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");

      let remainingPaid = amountPaidKes ?? 0;
      const lineItems = lines
        .filter((r) => r.description.trim() && Number(r.quantity) > 0)
        .map((r) => {
          const invoiceTotal = lineRowTotalKes(r.quantity, r.unitAmountKes) ?? 0;
          const paidRaw = r.amountPaidKes.trim();
          const paid =
            paidRaw === ""
              ? Math.min(invoiceTotal, Math.max(0, remainingPaid))
              : Math.round(Number(paidRaw) || 0);
          remainingPaid = Math.max(0, remainingPaid - paid);
          return {
            description: r.description.trim(),
            quantity: Number(r.quantity),
            unitAmountKes: Math.round(Number(r.unitAmountKes) || 0),
            amountPaidKes: paid,
          };
        });

      if (lineItems.length === 0) throw new Error("Add at least one line with description, quantity, and rate.");
      if (amountPaidKes == null) throw new Error("Enter the amount paid.");

      const res = await fetch("/api/fusion-xpress/receipts/pdf", {
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
          relatedInvoice: relatedInvoice.trim() || undefined,
          receiptDateIso: receiptDate.trim() || null,
          paymentDateIso: paymentDate.trim() || null,
          amountPaidKes,
          paymentMethod: paymentMethod.trim() || "M-Pesa transfer",
          mpesaReference: mpesaReference.trim() || undefined,
          mpesaNumber: mpesaNumber.trim() || undefined,
          memo: memo.trim() || undefined,
          balanceDueDays: Number(balanceDueDays) || 14,
          lineItems,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Could not generate receipt");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = parseFilenameFromDisposition(res.headers.get("Content-Disposition")) ?? "receipt.pdf";
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
          Issue a branded payment receipt when a customer or client pays against an invoice. The PDF matches the
          Changer Fusions receipt layout, including partial payments, M-Pesa details, and remaining balance. File names
          follow{" "}
          <span className="font-mono text-xs text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
            Receipt_CF-2026-716275-R1_Client_Name.pdf
          </span>
          .
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start border border-gray-100 rounded-lg p-4 bg-gray-50/80">
        <div className="shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm relative h-14 w-[200px]">
          <Image src={BRAND_LOGO_URL} alt="Changer Fusions" fill className="object-contain p-1" sizes="200px" />
        </div>
        <div className="text-sm text-gray-700 leading-relaxed min-w-0">
          <div className="font-bold text-gray-900">Changer Fusions</div>
          <div>Ambalal Building, Nkruma Road · Ambalal, Mombasa, Kenya</div>
          <div className="mt-1 text-gray-500">Receipt number is the related invoice plus -R1 when you leave it blank.</div>
          <div className="mt-3 text-xs text-gray-700 leading-relaxed border-t border-gray-200 pt-3">
            <span className="font-bold text-gray-900">M-Pesa Paybill</span> {INVOICE_MPESA_PAYBILL}
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-bold text-gray-900">Account No.</span> {INVOICE_MPESA_ACCOUNT}
            <span className="block mt-1 text-gray-600">
              Printed on the memo when a balance remains, so the client can clear the rest against the invoice
              reference.
            </span>
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
              placeholder="e.g. INUKA AFRIKA PROPERTIES LTD"
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
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Related invoice</label>
            <input
              value={relatedInvoice}
              onChange={(e) => setRelatedInvoice(e.target.value)}
              placeholder="e.g. CF-2026-716275"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">Leave blank to generate a new CF reference. Receipt number becomes that reference plus -R1.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Receipt date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Payment date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Amount paid (KSh) *</label>
            <input
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 9500"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
            >
              <option>M-Pesa transfer</option>
              <option>M-Pesa Paybill</option>
              <option>Bank transfer</option>
              <option>Card / Paystack</option>
              <option>Cash</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">M-Pesa reference</label>
              <input
                value={mpesaReference}
                onChange={(e) => setMpesaReference(e.target.value)}
                placeholder="e.g. UH43P23PUP"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Received on number</label>
              <input
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                placeholder="e.g. 254796988686"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Balance due within (days)</label>
            <input
              value={balanceDueDays}
              onChange={(e) => setBalanceDueDays(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" aria-hidden />
            Line items (KSh)
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add line
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Put a second line in the description for notes such as “Deposit payment received via M-Pesa”. Leave Amount
          paid blank on a row to apply the line’s invoice total.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 font-bold text-gray-800">Description</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-20">Qty</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-28">Rate (KSh)</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-32 text-right tabular-nums">Invoice total</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-32">Amount paid</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => {
                const draftTotal = lineRowTotalKes(row.quantity, row.unitAmountKes);
                const included = row.description.trim() && draftTotal != null;
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 align-top">
                      <textarea
                        value={row.description}
                        onChange={(e) => updateLine(row.id, { description: e.target.value })}
                        placeholder={"Service or product\nDeposit payment received via M-Pesa"}
                        rows={2}
                        className="w-full min-w-[200px] rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={row.quantity}
                        onChange={(e) => updateLine(row.id, { quantity: e.target.value })}
                        inputMode="decimal"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={row.unitAmountKes}
                        onChange={(e) => updateLine(row.id, { unitAmountKes: e.target.value })}
                        inputMode="numeric"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td
                      className={`px-3 py-2 align-top text-right tabular-nums text-sm font-semibold ${
                        included ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {draftTotal != null ? draftTotal.toLocaleString("en-KE") : "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={row.amountPaidKes}
                        onChange={(e) => updateLine(row.id, { amountPaidKes: e.target.value })}
                        inputMode="numeric"
                        placeholder={draftTotal != null ? String(draftTotal) : ""}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex p-1.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-700"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={3} className="px-3 py-3 text-right text-sm font-extrabold text-gray-900">
                  Invoice total
                </td>
                <td className="px-3 py-3 text-right text-base font-extrabold tabular-nums text-gray-900">
                  KSh {invoiceTotalKes.toLocaleString("en-KE")}
                </td>
                <td colSpan={2} className="px-3 py-3 text-sm font-semibold tabular-nums text-gray-800">
                  Paid {amountPaidKes != null ? `KSh ${amountPaidKes.toLocaleString("en-KE")}` : "—"}
                  <span className="block text-xs font-medium text-gray-500">
                    Balance KSh {balanceDueKes.toLocaleString("en-KE")}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Memo (optional)</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          placeholder="Leave blank to use the standard payment confirmation and Paybill instructions."
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
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
          Download receipt PDF
        </button>
        {!canSubmit ? (
          <span className="text-xs text-gray-500">
            Enter bill-to name, at least one valid line, and an amount paid that is not more than the invoice total.
          </span>
        ) : null}
      </div>
    </div>
  );
}
