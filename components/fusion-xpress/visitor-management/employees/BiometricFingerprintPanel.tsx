"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Fingerprint, Loader2, RefreshCw, Trash2 } from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
  DEFAULT_BIOMETRIC_FINGER_INDEX,
  DEFAULT_BIOMETRIC_FINGER_LABEL,
  BIOMETRIC_SETUP_MESSAGE,
  getOrCreateBiometricDeviceId,
  type BiometricEnrollmentRecord,
} from "@/lib/employees/biometric";
import { browserDeviceLabel } from "@/lib/employees/device-fingerprint";
import {
  isPlatformWebAuthnAvailable,
  registerEmployeeWebAuthn,
} from "@/lib/employees/webauthn-browser";
import { supabase } from "@/lib/supabase";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";

type EmployeeOption = {
  id: string;
  fullName: string;
  employeeCode: string | null;
  status: string;
};

type TerminalInfo = {
  id: string;
  name: string;
  terminalToken: string;
  checkUrl: string;
  status: string;
};

type Props = {
  adminOwnerId?: string | null;
};

export default function BiometricFingerprintPanel({ adminOwnerId }: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [enrollments, setEnrollments] = useState<BiometricEnrollmentRecord[]>([]);
  const [terminal, setTerminal] = useState<TerminalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [padReady, setPadReady] = useState(false);
  const [externalId, setExternalId] = useState("");
  const [copied, setCopied] = useState(false);

  const ownerQs = adminOwnerId ? `?owner=${encodeURIComponent(adminOwnerId)}` : "";

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) map.set(e.id, e.fullName);
    return map;
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSetupRequired(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const headers = { Authorization: `Bearer ${token}` };
      const [empRes, enrRes, termRes] = await Promise.all([
        fetch(`/api/visitor-employees${ownerQs}`, { headers, cache: "no-store" }),
        fetch(`/api/visitor-employees/biometric/enrollments${ownerQs}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`/api/visitor-employees/biometric/terminals${ownerQs}`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const empJson = (await empRes.json().catch(() => ({}))) as {
        employees?: EmployeeOption[];
        error?: string;
        setupRequired?: boolean;
      };
      const enrJson = (await enrRes.json().catch(() => ({}))) as {
        enrollments?: BiometricEnrollmentRecord[];
        error?: string;
        setupRequired?: boolean;
        message?: string;
        upgradeRequired?: boolean;
        subscriptionExpired?: boolean;
      };
      const termJson = (await termRes.json().catch(() => ({}))) as {
        terminal?: TerminalInfo;
        error?: string;
        setupRequired?: boolean;
        message?: string;
      };

      if (empRes.ok && empJson.employees) {
        setEmployees(
          empJson.employees.filter((e) => e.status === "active").map((e) => ({
            id: e.id,
            fullName: e.fullName,
            employeeCode: e.employeeCode,
            status: e.status,
          }))
        );
      }

      if (enrJson.setupRequired || termJson.setupRequired) {
        setSetupRequired(true);
        setError(enrJson.message ?? termJson.message ?? BIOMETRIC_SETUP_MESSAGE);
        setEnrollments([]);
        setTerminal(null);
        return;
      }

      if (!enrRes.ok) {
        throw new Error(enrJson.error ?? "Could not load enrollments");
      }
      if (!termRes.ok) {
        throw new Error(termJson.error ?? "Could not load biometric terminal");
      }

      setEnrollments(enrJson.enrollments ?? []);
      setTerminal(termJson.terminal ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load biometric module");
    } finally {
      setLoading(false);
    }
  }, [ownerQs]);

  useEffect(() => {
    void load();
  }, [load]);

  const enroll = async () => {
    if (!employeeId) {
      setError("Select an employee first.");
      return;
    }
    if (!padReady) {
      setError("Complete the fingerprint pad capture before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const selected = employees.find((e) => e.id === employeeId);
      let vendor = "webauthn";

      if (externalId.trim()) {
        vendor = "hardware";
        const res = await fetch(`/api/visitor-employees/biometric/enrollments${ownerQs}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId,
            fingerIndex: DEFAULT_BIOMETRIC_FINGER_INDEX,
            externalId: externalId.trim(),
            vendor,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          employeeName?: string;
          setupRequired?: boolean;
          message?: string;
        };
        if (!res.ok) {
          if (json.setupRequired) {
            setSetupRequired(true);
            setError(json.message ?? BIOMETRIC_SETUP_MESSAGE);
            return;
          }
          throw new Error(json.error ?? "Enrollment failed");
        }
        setMessage(
          `Enrolled ${DEFAULT_BIOMETRIC_FINGER_LABEL} for ${json.employeeName ?? "employee"} with hardware scanner id.`
        );
      } else {
        if (!isPlatformWebAuthnAvailable()) {
          throw new Error(
            "This device does not support fingerprint sign-in. Use the reception tablet or a phone with a fingerprint sensor."
          );
        }

        const optRes = await fetch(
          `/api/visitor-employees/biometric/webauthn/register/options${ownerQs}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ employeeId }),
          }
        );
        const optJson = (await optRes.json().catch(() => ({}))) as {
          error?: string;
          options?: Parameters<typeof registerEmployeeWebAuthn>[0];
        };
        if (!optRes.ok || !optJson.options) {
          throw new Error(optJson.error ?? "Could not start fingerprint registration.");
        }

        const attestation = await registerEmployeeWebAuthn(optJson.options);
        const verifyRes = await fetch(
          `/api/visitor-employees/biometric/webauthn/register/verify${ownerQs}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employeeId,
              attestation,
              deviceId: getOrCreateBiometricDeviceId(),
              deviceLabel: `${browserDeviceLabel()} · biometric terminal`,
            }),
          }
        );
        const json = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
          employeeName?: string;
          setupRequired?: boolean;
          message?: string;
        };
        if (!verifyRes.ok) {
          if (json.setupRequired) {
            setSetupRequired(true);
            setError(json.message ?? BIOMETRIC_SETUP_MESSAGE);
            return;
          }
          throw new Error(json.error ?? "Enrollment failed");
        }
        setMessage(
          `Enrolled ${DEFAULT_BIOMETRIC_FINGER_LABEL} for ${json.employeeName ?? selected?.fullName ?? "employee"} on this kiosk. They can check in by searching their member ID or name, then using this fingerprint sensor.`
        );
      }
      setPadReady(false);
      setExternalId("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this fingerprint enrollment?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const url = pathWithOwner(
        `/api/visitor-employees/biometric/enrollments/${id}`,
        adminOwnerId
      );
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not revoke enrollment");
      setMessage("Enrollment revoked.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not revoke enrollment");
    } finally {
      setSaving(false);
    }
  };

  const copyTerminalLink = async () => {
    if (!terminal?.checkUrl) return;
    try {
      await navigator.clipboard.writeText(terminal.checkUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading biometric fingerprint module…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {setupRequired ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error ?? BIOMETRIC_SETUP_MESSAGE}
        </p>
      ) : null}
      {error && !setupRequired ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {!setupRequired ? (
        <>
          <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-sky-700" />
                  Reception fingerprint terminal
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Keep <strong>one tablet/gadget</strong> at reception on your business premise. Open
                  this link and leave it on the search screen. Employees look up their member ID or
                  name, then use the <strong>right thumb</strong> on that same terminal (GPS must
                  stay on). Enroll each person here on this kiosk first. QR stays on Employees →
                  Kiosk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
            {terminal ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={terminal.checkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open terminal
                </Link>
                <button
                  type="button"
                  onClick={() => void copyTerminalLink()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Terminal not available yet.</p>
            )}
          </section>

          <section className="border border-[#e5e5e5] bg-white p-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enroll a fingerprint</h2>
              <p className="mt-1 text-sm text-gray-600">
                Enroll on the <strong>shared reception tablet/phone</strong> using the right thumb.
                That registers a fingerprint credential on this kiosk. At check-in, staff search
                their member ID or name, then confirm on this sensor. Unregistered staff must be
                added here first. QR stays on the Kiosk page. Optional hardware scanner id is for
                USB/Ethernet readers.
              </p>
            </div>

            <label className="block text-sm max-w-xl">
              <span className="font-semibold text-gray-800">Employee</span>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setPadReady(false);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                    {e.employeeCode ? ` (${e.employeeCode})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-sm text-gray-700">
              Finger: <span className="font-semibold">{DEFAULT_BIOMETRIC_FINGER_LABEL}</span>
            </p>

            <label className="block text-sm max-w-xl">
              <span className="font-semibold text-gray-800">
                Hardware scanner id <span className="font-normal text-gray-500">(optional)</span>
              </span>
              <input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Vendor template / user id from fingerprint device"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </label>

            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-4 py-6">
              <FingerprintPad
                key={employeeId}
                mode="enroll"
                disabled={!employeeId || saving}
                onComplete={() => setPadReady(true)}
                label={DEFAULT_BIOMETRIC_FINGER_LABEL}
              />
              <button
                type="button"
                disabled={!employeeId || !padReady || saving}
                onClick={() => void enroll()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                Save enrollment
              </button>
            </div>
          </section>

          <section className="border border-[#e5e5e5] bg-white p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Active enrollments</h2>
            {enrollments.length === 0 ? (
              <p className="text-sm text-gray-600">No fingerprints enrolled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Employee</th>
                      <th className="py-2 pr-3 font-semibold">Finger</th>
                      <th className="py-2 pr-3 font-semibold">Source</th>
                      <th className="py-2 pr-3 font-semibold">Enrolled</th>
                      <th className="py-2 pr-3 font-semibold">Last match</th>
                      <th className="py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-2.5 pr-3 font-medium text-gray-900">
                          {employeeNameById.get(row.employeeId) ?? "Employee"}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-700">{row.fingerLabel}</td>
                        <td className="py-2.5 pr-3 text-gray-700">
                          {row.vendor === "hardware"
                            ? "Hardware"
                            : row.vendor === "webauthn"
                              ? "Kiosk fingerprint"
                              : "Fusion pad"}
                          {row.externalId ? (
                            <span className="block text-xs text-gray-500">{row.externalId}</span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">
                          {new Date(row.enrolledAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">
                          {row.lastMatchedAt
                            ? new Date(row.lastMatchedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void revoke(row.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
