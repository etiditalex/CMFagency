"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Link2, RefreshCw, X } from "lucide-react";

import VisitorPassQr from "@/components/fusion-xpress/visitor-management/VisitorPassQr";
import { supabase } from "@/lib/supabase";
import { industryLabel } from "@/lib/visitors/industry-options";
import { visitorPhonesMatch } from "@/lib/visitors/phone";
import {
  industryPreRegisterUrl,
  isPreregisterVisitor,
  visitorGateTokenForOwner,
} from "@/lib/visitors/preregistration";
import type { VisitorRecord, VisitorStatus } from "@/lib/visitors/types";
import { statusLabel } from "@/lib/visitors/utils";

type VisitorVerificationPanelProps = {
  visitors: VisitorRecord[];
  industrySlug: string;
  ownerId: string;
  disabled?: boolean;
  buildApiUrl?: (path: string) => string;
  onVisitorsChanged?: () => void;
};

function statusCellClass(status: VisitorStatus): string {
  if (status === "checked_in") return "text-primary-800 font-semibold";
  if (status === "rejected") return "text-red-700 font-semibold";
  if (status === "checked_out") return "text-slate-600 font-semibold";
  return "text-amber-800 font-semibold";
}

function exportVerificationCsv(records: VisitorRecord[]) {
  const header = [
    "Visitor Name",
    "Contact Number",
    "Visit Date",
    "Industry",
    "Host",
    "Device",
    "Status",
  ];
  const rows = records.map((r) => [
    r.fullName,
    r.phoneNumber,
    r.visitDate,
    industryLabel(r.industrySlug),
    r.host,
    r.deviceLabel ?? "",
    statusLabel(r.status, r.source),
  ]);
  const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "visitor-pre-registrations.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function VisitorVerificationPanel({
  visitors,
  industrySlug,
  ownerId,
  disabled,
  buildApiUrl = (path) => path,
  onVisitorsChanged,
}: VisitorVerificationPanelProps) {
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [phoneInput, setPhoneInput] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [visitorNameDisplay, setVisitorNameDisplay] = useState("");
  const [visitDateDisplay, setVisitDateDisplay] = useState("");
  const [hostDisplay, setHostDisplay] = useState("");
  const [deviceDisplay, setDeviceDisplay] = useState("");
  const [notes, setNotes] = useState("");

  const preRegistrations = useMemo(
    () =>
      visitors.filter(
        (v) =>
          isPreregisterVisitor(v.source, v.formExtra) ||
          Boolean(v.registeredDeviceId)
      ),
    [visitors]
  );

  const visitorByPhone = useCallback(
    (value: string) => {
      if (!value.trim()) return null;
      return (
        preRegistrations.find((v) => visitorPhonesMatch(v.phoneNumber, value)) ??
        visitors.find((v) => visitorPhonesMatch(v.phoneNumber, value)) ??
        null
      );
    },
    [preRegistrations, visitors]
  );

  const selectedHistory = useMemo(() => {
    if (!visitorId && !phoneInput.trim()) return preRegistrations;
    const match = visitors.filter((v) => v.id === visitorId);
    if (match.length) {
      return visitors
        .filter((v) => visitorPhonesMatch(v.phoneNumber, match[0].phoneNumber))
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    }
    return preRegistrations.filter((v) => visitorPhonesMatch(v.phoneNumber, phoneInput));
  }, [preRegistrations, visitors, visitorId, phoneInput]);

  const pendingCount = useMemo(
    () =>
      preRegistrations.filter((v) => v.status === "pending" || v.status === "approved").length,
    [preRegistrations]
  );

  const shareUrl = useMemo(() => {
    if (!ownerId) return "";
    return industryPreRegisterUrl(
      industrySlug,
      ownerId,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
  }, [industrySlug, ownerId]);

  const gateToken = useMemo(
    () => (ownerId ? visitorGateTokenForOwner(ownerId) : ""),
    [ownerId]
  );

  const syncVisitor = (v: VisitorRecord | null) => {
    if (!v) {
      setVisitorId("");
      setVisitorNameDisplay("");
      setVisitDateDisplay("");
      setHostDisplay("");
      setDeviceDisplay("");
      return;
    }
    setVisitorId(v.id);
    setPhoneInput(v.phoneNumber);
    setVisitorNameDisplay(v.fullName);
    setVisitDateDisplay(v.visitDate);
    setHostDisplay(v.host);
    setDeviceDisplay(v.deviceLabel || "—");
  };

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const resetForm = () => {
    setPhoneInput("");
    setNotes("");
    syncVisitor(null);
    setError(null);
    setNotice(null);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInput(value);
    const match = visitorByPhone(value);
    if (match) syncVisitor(match);
    else if (!value.trim()) syncVisitor(null);
  };

  const updateStatus = async (id: string, status: VisitorStatus) => {
    setActingId(id);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl(`/api/visitors/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        visitor?: VisitorRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      if (json.visitor) syncVisitor(json.visitor);
      if (status === "checked_in") setNotice("Visitor verified and checked in.");
      else if (status === "approved") setNotice("Pre-registration verified.");
      else if (status === "rejected") setNotice("Pre-registration rejected.");
      onVisitorsChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const match = visitorByPhone(phoneInput);
    if (!match) {
      setError("No pre-registration found for this contact number.");
      return;
    }
    if (match.status === "checked_in") {
      setNotice(`${match.fullName} is already checked in.`);
      syncVisitor(match);
      return;
    }
    if (match.status === "rejected") {
      setError("This pre-registration was rejected.");
      return;
    }
    setSaving(true);
    try {
      await updateStatus(match.id, "checked_in");
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this pre-registration link:", shareUrl);
    }
  };

  useEffect(() => {
    if (visitorId || pendingCount === 0) return;
    const latest = [...preRegistrations].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    )[0];
    if (latest) syncVisitor(latest);
  }, [visitorId, pendingCount, preRegistrations]);

  const inputClass =
    "w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-400";
  const labelClass = "w-[9.5rem] shrink-0 pt-2 text-sm font-semibold text-white";

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded border border-primary-300 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-900">
          {notice}
        </p>
      ) : null}

      <div className="rounded border-2 border-white/90 bg-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <Link2 className="h-4 w-4 shrink-0" />
              {industryLabel(industrySlug)} pre-registration link
            </p>
            <p className="mt-1 text-xs text-white/80">
              Share this industry form. Guests register on their phone. On arrival they scan the
              reception QR — we verify the same device and contact number.
            </p>
            <p className="mt-2 break-all rounded border border-white/20 bg-white/90 px-3 py-2 font-mono text-xs text-slate-800">
              {shareUrl || "…"}
            </p>
            <button
              type="button"
              onClick={() => void copyShareLink()}
              className="mt-3 inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-lg bg-white p-3">
            <VisitorPassQr gateToken={gateToken} size={148} label="Reception arrival QR" />
          </div>
        </div>
      </div>

      <div className="relative rounded border-2 border-white/90 px-4 pb-5 pt-8 sm:px-6">
        <p className="absolute -top-3 left-4 bg-primary-600 px-2 text-base font-bold text-white">
          Verify visitor:
        </p>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className={labelClass}>Contact Number</span>
              <div className="min-w-0 flex-1">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={disabled || saving}
                  placeholder="Number used at pre-registration"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Visitor Name</span>
              <input
                type="text"
                value={visitorNameDisplay}
                readOnly
                disabled={disabled || saving}
                placeholder="Auto-filled from contact number"
                className={`${inputClass} bg-slate-50`}
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Visit Date</span>
              <input
                type="text"
                value={visitDateDisplay}
                readOnly
                disabled={disabled || saving}
                placeholder="Auto-filled"
                className={`${inputClass} bg-slate-50`}
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Host</span>
              <input
                type="text"
                value={hostDisplay}
                readOnly
                disabled={disabled || saving}
                placeholder="Auto-filled"
                className={`${inputClass} bg-slate-50`}
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Registered Device</span>
              <input
                type="text"
                value={deviceDisplay}
                readOnly
                disabled={disabled || saving}
                placeholder="Captured at pre-registration"
                className={`${inputClass} bg-slate-50`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-semibold text-white">Verification notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={disabled || saving}
                rows={7}
                placeholder="Optional reception notes…"
                className={`${inputClass} min-h-[140px] resize-y`}
                maxLength={500}
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={disabled || saving}
                className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={disabled || saving || !phoneInput.trim()}
                className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Check in"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Pre-registration history</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVisitorsChanged?.()}
              className="inline-flex items-center gap-1.5 rounded border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              title="Refresh pre-registrations"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => exportVerificationCsv(selectedHistory)}
              disabled={selectedHistory.length === 0}
              className="inline-flex items-center justify-center rounded border border-white/40 bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-40"
              title="Export pre-registrations"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[220px] overflow-hidden rounded border-2 border-white/60 bg-primary-50/95 shadow-inner">
          {selectedHistory.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-primary-800">
              No pre-registrations yet. Share the industry form link above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-slate-800">
                <thead>
                  <tr className="border-b border-primary-200 bg-primary-100/80 text-xs font-bold uppercase tracking-wide text-primary-900">
                    <th className="px-4 py-2.5">Visit Date</th>
                    <th className="px-4 py-2.5">Visitor</th>
                    <th className="px-4 py-2.5">Contact</th>
                    <th className="px-4 py-2.5">Device</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {selectedHistory.map((record) => {
                    const open = record.status === "pending" || record.status === "approved";
                    return (
                      <tr
                        key={record.id}
                        className={`cursor-pointer transition hover:bg-primary-100/60 ${
                          open ? "bg-amber-50/90" : "bg-white/80"
                        }`}
                        onClick={() => syncVisitor(record)}
                      >
                        <td className="px-4 py-2.5 font-medium">{record.visitDate}</td>
                        <td className="px-4 py-2.5">{record.fullName}</td>
                        <td className="px-4 py-2.5">{record.phoneNumber}</td>
                        <td className="max-w-[140px] truncate px-4 py-2.5 text-slate-600" title={record.deviceLabel ?? ""}>
                          {record.deviceLabel || "—"}
                        </td>
                        <td className={`px-4 py-2.5 ${statusCellClass(record.status)}`}>
                          {statusLabel(record.status, record.source)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div
                            className="flex flex-wrap justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {open ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void updateStatus(record.id, "checked_in")}
                                  disabled={disabled || actingId === record.id}
                                  className="inline-flex items-center gap-1 rounded border border-primary-400 bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-900 hover:bg-primary-200 disabled:opacity-60"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Check in
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void updateStatus(record.id, "rejected")}
                                  disabled={disabled || actingId === record.id}
                                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pendingCount > 0 ? (
          <p className="mt-2 text-xs text-white/85">
            {pendingCount} open pre-registration{pendingCount === 1 ? "" : "s"} — click a row to
            load details or check the guest in when they arrive.
          </p>
        ) : null}
      </div>
    </div>
  );
}
