"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Eye,
  LogIn,
  LogOut,
  Plus,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import MockQrCode from "@/components/fusion-xpress/visitor-management/MockQrCode";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { MOCK_VISITORS } from "@/lib/visitors/mock-data";
import type { VisitorFormInput, VisitorRecord, VisitorStatus } from "@/lib/visitors/types";
import {
  createVisitorId,
  formatVisitDateTime,
  generateQrToken,
  statusBadgeClass,
  statusLabel,
  visitorStats,
} from "@/lib/visitors/utils";

const EMPTY_FORM: VisitorFormInput = {
  fullName: "",
  phoneNumber: "",
  idPassportNumber: "",
  vehiclePlateNumber: "",
  host: "",
  purposeOfVisit: "",
  visitDate: "",
  visitTime: "",
};

export default function DashboardVisitorManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [visitors, setVisitors] = useState<VisitorRecord[]>(MOCK_VISITORS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VisitorFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailVisitor, setDetailVisitor] = useState<VisitorRecord | null>(null);
  const [qrPreview, setQrPreview] = useState<VisitorRecord | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
    }
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  const stats = useMemo(() => visitorStats(visitors), [visitors]);

  const updateVisitor = useCallback((id: string, patch: Partial<VisitorRecord>) => {
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v
      )
    );
    setDetailVisitor((d) => (d?.id === id ? { ...d, ...patch } : d));
  }, []);

  const setStatus = useCallback(
    (id: string, status: VisitorStatus) => {
      if (status === "approved") {
        updateVisitor(id, { status, qrCodeToken: generateQrToken(id) });
        return;
      }
      if (status === "rejected") {
        updateVisitor(id, { status, qrCodeToken: null });
        return;
      }
      updateVisitor(id, { status });
    },
    [updateVisitor]
  );

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      !form.fullName.trim() ||
      !form.phoneNumber.trim() ||
      !form.host.trim() ||
      !form.purposeOfVisit.trim() ||
      !form.visitDate ||
      !form.visitTime
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const id = createVisitorId();
    const now = new Date().toISOString();
    const record: VisitorRecord = {
      id,
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      idPassportNumber: form.idPassportNumber.trim(),
      vehiclePlateNumber: form.vehiclePlateNumber.trim(),
      host: form.host.trim(),
      purposeOfVisit: form.purposeOfVisit.trim(),
      visitDate: form.visitDate,
      visitTime: form.visitTime,
      status: "pending",
      qrCodeToken: null,
      createdAt: now,
      updatedAt: now,
    };
    setVisitors((prev) => [record, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const statCards = [
    { label: "Today's Visitors", value: stats.todaysVisitors, icon: Calendar, tone: "text-primary-700 bg-primary-50 border-primary-100" },
    { label: "Pending Approvals", value: stats.pendingApprovals, icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { label: "Checked-in Visitors", value: stats.checkedIn, icon: LogIn, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "Checked-out Visitors", value: stats.checkedOut, icon: LogOut, tone: "text-slate-700 bg-slate-50 border-slate-200" },
  ];

  if (authLoading || portalLoading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">Loading visitor management…</div>
    );
  }

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-primary-600" />
            Visitor Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Pre-register guests, approve visits, and manage QR passes. Mock data — ready for API wiring.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Hide form" : "Book visitor"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl border p-4 ${c.tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{c.label}</span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="mt-2 text-2xl font-extrabold">{c.value}</div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmitBooking}
          className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-900">New visitor booking</h2>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Full Name *</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Phone Number *</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">ID / Passport Number</span>
              <input
                type="text"
                value={form.idPassportNumber}
                onChange={(e) => setForm((f) => ({ ...f, idPassportNumber: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Vehicle Plate Number</span>
              <input
                type="text"
                value={form.vehiclePlateNumber}
                onChange={(e) => setForm((f) => ({ ...f, vehiclePlateNumber: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-gray-700">Host / Person to Visit *</span>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-gray-700">Purpose of Visit *</span>
              <input
                type="text"
                value={form.purposeOfVisit}
                onChange={(e) => setForm((f) => ({ ...f, purposeOfVisit: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Visit Date *</span>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Visit Time *</span>
              <input
                type="time"
                value={form.visitTime}
                onChange={(e) => setForm((f) => ({ ...f, visitTime: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm py-2 px-4">
              Save booking
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
                setFormError(null);
              }}
              className="btn-outline text-sm py-2 px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-800">All visitors</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Visitor Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Host</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
                <th className="px-4 py-3 font-semibold">Visit Date/Time</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">QR Code</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{v.phoneNumber}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate" title={v.host}>
                    {v.host}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={v.purposeOfVisit}>
                    {v.purposeOfVisit}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatVisitDateTime(v.visitDate, v.visitTime)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusBadgeClass(v.status)}`}
                    >
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.qrCodeToken ? (
                      <button
                        type="button"
                        onClick={() => setQrPreview(v)}
                        className="inline-flex"
                        title="View QR pass"
                      >
                        <MockQrCode token={v.qrCodeToken} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.status === "pending" && (
                        <>
                          <ActionBtn label="Approve" onClick={() => setStatus(v.id, "approved")} tone="green" />
                          <ActionBtn label="Reject" onClick={() => setStatus(v.id, "rejected")} tone="red" />
                        </>
                      )}
                      {v.status === "approved" && (
                        <ActionBtn label="Check In" onClick={() => setStatus(v.id, "checked_in")} tone="blue" />
                      )}
                      {v.status === "checked_in" && (
                        <ActionBtn label="Check Out" onClick={() => setStatus(v.id, "checked_out")} tone="slate" />
                      )}
                      <ActionBtn label="Details" onClick={() => setDetailVisitor(v)} tone="gray" icon={Eye} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailVisitor && (
        <DetailModal visitor={detailVisitor} onClose={() => setDetailVisitor(null)} />
      )}

      {qrPreview?.qrCodeToken && (
        <QrModal
          visitor={qrPreview}
          onClose={() => setQrPreview(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  tone,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  tone: "green" | "red" | "blue" | "slate" | "gray";
  icon?: typeof Eye;
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
    red: "bg-red-50 text-red-800 hover:bg-red-100 border-red-200",
    blue: "bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200",
    slate: "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200",
    gray: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${tones[tone]}`}
    >
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {label}
    </button>
  );
}

function DetailModal({ visitor, onClose }: { visitor: VisitorRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">Visitor details</h3>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            ["Name", visitor.fullName],
            ["Phone", visitor.phoneNumber],
            ["ID / Passport", visitor.idPassportNumber || "—"],
            ["Vehicle", visitor.vehiclePlateNumber || "—"],
            ["Host", visitor.host],
            ["Purpose", visitor.purposeOfVisit],
            ["Visit", formatVisitDateTime(visitor.visitDate, visitor.visitTime)],
            ["Status", statusLabel(visitor.status)],
          ].map(([k, val]) => (
            <div key={k} className="flex gap-2">
              <dt className="font-medium text-gray-500 w-28 flex-shrink-0">{k}</dt>
              <dd className="text-gray-900">{val}</dd>
            </div>
          ))}
        </dl>
        {visitor.qrCodeToken && (
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Visitor pass</p>
            <MockQrCode token={visitor.qrCodeToken} label={visitor.qrCodeToken} />
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-6 w-full btn-primary text-sm py-2">
          Close
        </button>
      </div>
    </div>
  );
}

function QrModal({ visitor, onClose }: { visitor: VisitorRecord; onClose: () => void }) {
  const token = visitor.qrCodeToken!;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900">{visitor.fullName}</h3>
        <p className="text-sm text-gray-500 mt-1">Approved visitor pass</p>
        <div className="mt-6 flex justify-center">
          <MockQrCode token={token} className="scale-125" label={token} />
        </div>
        <p className="mt-4 text-xs text-gray-400 font-mono break-all">{token}</p>
        <button type="button" onClick={onClose} className="mt-6 w-full btn-outline text-sm py-2">
          Close
        </button>
      </div>
    </div>
  );
}
