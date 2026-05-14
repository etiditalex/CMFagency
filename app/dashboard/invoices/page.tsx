"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { supabase } from "@/lib/supabase";

type Line = { id: string; description: string; quantity: string; unitAmountKes: string };

function newLine(): Line {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, description: "", quantity: "1", unitAmountKes: "" };
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

export default function DashboardInvoicesPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isEmployer } = usePortal();

  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToPhone, setBillToPhone] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [documentTitle, setDocumentTitle] = useState("Proforma Invoice");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(), newLine()]);

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

  const canSubmit = useMemo(() => {
    if (!billToName.trim()) return false;
    return lines.some(
      (r) =>
        r.description.trim() &&
        Number(r.quantity) > 0 &&
        Number.isFinite(Number(r.unitAmountKes)) &&
        Number(r.unitAmountKes) >= 0
    );
  }, [billToName, lines]);

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

      const lineItems = lines
        .filter((r) => r.description.trim() && Number(r.quantity) > 0)
        .map((r) => ({
          description: r.description.trim(),
          quantity: Number(r.quantity),
          unitAmountKes: Math.round(Number(r.unitAmountKes) || 0),
        }));

      if (lineItems.length === 0) throw new Error("Add at least one line with description, quantity, and unit price.");

      const res = await fetch("/api/fusion-xpress/invoices/pdf", {
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
          documentTitle: documentTitle.trim() || "Proforma Invoice",
          dueDateIso: dueDate.trim() || null,
          notes: notes.trim() || undefined,
          lineItems,
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
      a.download = parseFilenameFromDisposition(res.headers.get("Content-Disposition")) ?? "invoice.pdf";
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
          Generate a branded Changer Fusions PDF in one click. The file name follows your billing name and Nairobi
          date/time, for example{" "}
          <span className="font-mono text-xs text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
            INVOICE FOR MR. JUSTINE _20260504_153039_0000.pdf
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
          <div className="mt-1 text-gray-500">Logo and layout match public invoices; amounts are in KSh.</div>
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
              placeholder="e.g. MR. JUSTINE"
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
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Document title</label>
            <input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
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
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Address</label>
            <textarea
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" aria-hidden />
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
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 font-bold text-gray-800">Description</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-24">Qty</th>
                <th className="px-3 py-2 font-bold text-gray-800 w-32">Unit (KSh)</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 align-top">
                    <input
                      value={row.description}
                      onChange={(e) => updateLine(row.id, { description: e.target.value })}
                      placeholder="Service or product"
                      className="w-full min-w-[180px] rounded border border-gray-200 px-2 py-1.5 text-sm"
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
              ))}
            </tbody>
          </table>
        </div>
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
        {!canSubmit ? <span className="text-xs text-gray-500">Enter bill-to name and at least one valid line.</span> : null}
      </div>
    </div>
  );
}
