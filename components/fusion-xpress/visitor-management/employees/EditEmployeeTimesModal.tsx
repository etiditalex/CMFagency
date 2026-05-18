"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { EmployeeRecord } from "@/lib/employees/types";

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type EditEmployeeTimesModalProps = {
  employee: EmployeeRecord | null;
  onClose: () => void;
  onSave: (
    id: string,
    payload: {
      lastSignedInAt: string | null;
      lastSignedOutAt: string | null;
      attendanceStatus: "in" | "out";
    }
  ) => Promise<void>;
};

export default function EditEmployeeTimesModal({
  employee,
  onClose,
  onSave,
}: EditEmployeeTimesModalProps) {
  const [signIn, setSignIn] = useState("");
  const [signOut, setSignOut] = useState("");
  const [status, setStatus] = useState<"in" | "out">("out");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;
    setSignIn(toLocalInputValue(employee.lastSignedInAt));
    setSignOut(toLocalInputValue(employee.lastSignedOutAt));
    setStatus(employee.attendanceStatus);
    setError(null);
  }, [employee]);

  if (!employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(employee.id, {
        lastSignedInAt: localInputToIso(signIn),
        lastSignedOutAt: localInputToIso(signOut),
        attendanceStatus: status,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200"
        role="dialog"
        aria-labelledby="edit-times-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="edit-times-title" className="text-lg font-bold text-gray-900">
            Edit times — {employee.fullName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-600">Current status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "in" | "out")}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="in">Signed in</option>
              <option value="out">Signed out</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-600">Last sign-in</span>
            <input
              type="datetime-local"
              value={signIn}
              onChange={(e) => setSignIn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-600">Last sign-out</span>
            <input
              type="datetime-local"
              value={signOut}
              onChange={(e) => setSignOut(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-gray-500">
            Adjust times on the staff record. Kiosk QR scans still add new log entries.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save times"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
