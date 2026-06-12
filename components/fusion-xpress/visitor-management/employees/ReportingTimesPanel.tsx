"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Save } from "lucide-react";

import type { EmployeeReportingSettings } from "@/lib/employees/types";
import { DEFAULT_REPORTING_SETTINGS } from "@/lib/employees/db-mapper";
import { RETAIL_HOSPITALITY_SHIFT_DEFAULTS } from "@/lib/employees/shifts";
import { formatReportingTime, formatSignInWindowLabel } from "@/lib/employees/reporting-time";
import { supabase } from "@/lib/supabase";

type ReportingTimesPanelProps = {
  disabled?: boolean;
  isRealEstate?: boolean;
  isRetailHospitality?: boolean;
};

function shiftField(
  label: string,
  value: string,
  onChange: (v: string) => void,
  disabled: boolean
) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
      <input
        type="time"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function ReportingTimesPanel({
  disabled,
  isRealEstate = false,
  isRetailHospitality = false,
}: ReportingTimesPanelProps) {
  const [settings, setSettings] = useState<EmployeeReportingSettings>(DEFAULT_REPORTING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/visitor-employees/reporting-settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        settings?: EmployeeReportingSettings;
        setupRequired?: boolean;
        isRetailHospitality?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      if (json.setupRequired) {
        setSetupRequired(true);
        setSettings(
          isRetailHospitality
            ? { ...DEFAULT_REPORTING_SETTINGS, ...RETAIL_HOSPITALITY_SHIFT_DEFAULTS }
            : DEFAULT_REPORTING_SETTINGS
        );
        return;
      }
      if (json.settings) {
        setSettings(
          isRetailHospitality && !json.settings.shiftEnabled
            ? { ...json.settings, ...RETAIL_HOSPITALITY_SHIFT_DEFAULTS }
            : json.settings
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reporting times");
    } finally {
      setLoading(false);
    }
  }, [getToken, isRetailHospitality]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const payload = isRetailHospitality
        ? { ...settings, shiftEnabled: settings.shiftEnabled !== false }
        : settings;
      const res = await fetch("/api/visitor-employees/reporting-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        settings?: EmployeeReportingSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.settings) setSettings(json.settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => shiftField(label, value, onChange, disabled || setupRequired);

  const staffWindow = {
    signInStart: settings.staffReportingSignInStart,
    signInLatest: settings.staffReportingSignIn,
    signOut: settings.staffReportingSignOut,
  };

  const crmWindow = {
    signInStart: settings.crmReportingSignInStart,
    signInLatest: settings.crmReportingSignIn,
    signOut: settings.crmReportingSignOut,
  };

  const shift1Window = {
    signInStart: settings.shift1SignInStartTime ?? "06:00",
    signInLatest: settings.shift1SignInTime ?? "08:00",
    signOut: settings.shift1SignOutTime ?? "15:00",
  };

  const shift2Window = {
    signInStart: settings.shift2SignInStartTime ?? "15:00",
    signInLatest: settings.shift2SignInTime ?? "16:00",
    signOut: settings.shift2SignOutTime ?? "23:00",
  };

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-primary-100 bg-white/80 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-bold text-primary-900">Reporting times</span>
      </div>
      <form onSubmit={handleSave} className="p-4 space-y-4">
        <p className="text-xs text-primary-900/80">
          {isRetailHospitality ? (
            <>
              Retail and hospitality teams often work in <strong>two shifts</strong> (e.g. 6:00 AM–3:00 PM
              and 3:00 PM–11:00 PM). Set each shift&apos;s sign-in window and expected sign-out. Staff can
              clock in and out once per shift; hours are counted from the actual sign-in time.
            </>
          ) : (
            <>
              Set when staff should report to work and leave. Sign-in between the start and latest times
              counts as <strong>on time</strong>; after the latest time is marked{" "}
              <strong className="text-red-700">late</strong>. Sign-out is expected from the sign-out time
              (e.g. 5:00 PM).
            </>
          )}
          {isRealEstate ? (
            <>
              {" "}
              Real estate accounts can set different windows for <strong>staff</strong> and{" "}
              <strong>CRM</strong> teams.
            </>
          ) : null}
        </p>
        {setupRequired ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Run{" "}
            <code className="font-mono">database/visitor_employees_patch_03_real_estate_crm.sql</code>,{" "}
            <code className="font-mono">database/visitor_employees_patch_06_reporting_windows.sql</code>, and{" "}
            <code className="font-mono">database/visitor_employees_patch_10_shift_support.sql</code> in
            Supabase to save reporting times.
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        ) : null}
        {saved ? (
          <p className="text-xs text-emerald-800 font-semibold">Reporting times saved.</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : isRetailHospitality ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white bg-white p-3 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Shift 1 (morning)</p>
              {field("Shift hours from", settings.shift1StartTime ?? "06:00", (v) =>
                setSettings((s) => ({ ...s, shift1StartTime: v }))
              )}
              {field("Shift hours until", settings.shift1EndTime ?? "15:00", (v) =>
                setSettings((s) => ({ ...s, shift1EndTime: v }))
              )}
              {field("Sign-in from", settings.shift1SignInStartTime ?? "06:00", (v) =>
                setSettings((s) => ({ ...s, shift1SignInStartTime: v }))
              )}
              {field("Sign-in until (on time)", settings.shift1SignInTime ?? "08:00", (v) =>
                setSettings((s) => ({ ...s, shift1SignInTime: v }))
              )}
              {field("Sign-out from", settings.shift1SignOutTime ?? "15:00", (v) =>
                setSettings((s) => ({ ...s, shift1SignOutTime: v }))
              )}
              <p className="text-[10px] text-gray-500">
                Report {formatSignInWindowLabel(shift1Window)} · leave from{" "}
                {formatReportingTime(settings.shift1SignOutTime ?? "15:00")}
              </p>
            </div>
            <div className="rounded-lg border border-white bg-white p-3 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Shift 2 (evening)</p>
              {field("Shift hours from", settings.shift2StartTime ?? "15:00", (v) =>
                setSettings((s) => ({ ...s, shift2StartTime: v }))
              )}
              {field("Shift hours until", settings.shift2EndTime ?? "23:00", (v) =>
                setSettings((s) => ({ ...s, shift2EndTime: v }))
              )}
              {field("Sign-in from", settings.shift2SignInStartTime ?? "15:00", (v) =>
                setSettings((s) => ({ ...s, shift2SignInStartTime: v }))
              )}
              {field("Sign-in until (on time)", settings.shift2SignInTime ?? "16:00", (v) =>
                setSettings((s) => ({ ...s, shift2SignInTime: v }))
              )}
              {field("Sign-out from", settings.shift2SignOutTime ?? "23:00", (v) =>
                setSettings((s) => ({ ...s, shift2SignOutTime: v }))
              )}
              <p className="text-[10px] text-gray-500">
                Report {formatSignInWindowLabel(shift2Window)} · leave from{" "}
                {formatReportingTime(settings.shift2SignOutTime ?? "23:00")}
              </p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${isRealEstate ? "sm:grid-cols-2" : ""}`}>
            <div className="rounded-lg border border-white bg-white p-3 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                {isRealEstate ? "Staff team" : "Your organisation"}
              </p>
              {field("Sign-in from", settings.staffReportingSignInStart, (v) =>
                setSettings((s) => ({ ...s, staffReportingSignInStart: v }))
              )}
              {field("Sign-in until (on time)", settings.staffReportingSignIn, (v) =>
                setSettings((s) => ({ ...s, staffReportingSignIn: v }))
              )}
              {field("Sign-out from", settings.staffReportingSignOut, (v) =>
                setSettings((s) => ({ ...s, staffReportingSignOut: v }))
              )}
              <p className="text-[10px] text-gray-500">
                Report between {formatSignInWindowLabel(staffWindow)} · leave from{" "}
                {formatReportingTime(settings.staffReportingSignOut)}
              </p>
            </div>
            {isRealEstate ? (
              <div className="rounded-lg border border-white bg-white p-3 space-y-3">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">CRM team</p>
                {field("Sign-in from", settings.crmReportingSignInStart, (v) =>
                  setSettings((s) => ({ ...s, crmReportingSignInStart: v }))
                )}
                {field("Sign-in until (on time)", settings.crmReportingSignIn, (v) =>
                  setSettings((s) => ({ ...s, crmReportingSignIn: v }))
                )}
                {field("Sign-out from", settings.crmReportingSignOut, (v) =>
                  setSettings((s) => ({ ...s, crmReportingSignOut: v }))
                )}
                <p className="text-[10px] text-gray-500">
                  Report between {formatSignInWindowLabel(crmWindow)} · leave from{" "}
                  {formatReportingTime(settings.crmReportingSignOut)}
                </p>
              </div>
            ) : null}
          </div>
        )}
        <button
          type="submit"
          disabled={disabled || setupRequired || saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save reporting times"}
        </button>
      </form>
    </section>
  );
}
