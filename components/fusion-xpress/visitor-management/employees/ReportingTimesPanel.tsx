"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Save } from "lucide-react";

import type { EmployeeReportingSettings } from "@/lib/employees/types";
import { DEFAULT_REPORTING_SETTINGS } from "@/lib/employees/db-mapper";
import { formatReportingTime } from "@/lib/employees/reporting-time";
import { supabase } from "@/lib/supabase";

type ReportingTimesPanelProps = {
  disabled?: boolean;
};

export default function ReportingTimesPanel({ disabled }: ReportingTimesPanelProps) {
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
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      if (json.setupRequired) {
        setSetupRequired(true);
        setSettings(DEFAULT_REPORTING_SETTINGS);
        return;
      }
      if (json.settings) setSettings(json.settings);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reporting times");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

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
      const res = await fetch("/api/visitor-employees/reporting-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
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
  ) => (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
      <input
        type="time"
        disabled={disabled || setupRequired}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-primary-100 bg-white/80 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-bold text-primary-900">Real Estate — reporting times</span>
      </div>
      <form onSubmit={handleSave} className="p-4 space-y-4">
        <p className="text-xs text-primary-900/80">
          Set expected sign-in and sign-out times separately for <strong>staff</strong> and{" "}
          <strong>CRM</strong> teams. Attendance is compared against these windows on your dashboard.
        </p>
        {setupRequired ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Run <code className="font-mono">database/visitor_employees_patch_03_real_estate_crm.sql</code>{" "}
            in Supabase to save reporting times.
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
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white bg-white p-3 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Staff</p>
              {field("Expected sign-in", settings.staffReportingSignIn, (v) =>
                setSettings((s) => ({ ...s, staffReportingSignIn: v }))
              )}
              {field("Expected sign-out", settings.staffReportingSignOut, (v) =>
                setSettings((s) => ({ ...s, staffReportingSignOut: v }))
              )}
              <p className="text-[10px] text-gray-500">
                Window: {formatReportingTime(settings.staffReportingSignIn)} –{" "}
                {formatReportingTime(settings.staffReportingSignOut)}
              </p>
            </div>
            <div className="rounded-lg border border-white bg-white p-3 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">CRM team</p>
              {field("Expected sign-in", settings.crmReportingSignIn, (v) =>
                setSettings((s) => ({ ...s, crmReportingSignIn: v }))
              )}
              {field("Expected sign-out", settings.crmReportingSignOut, (v) =>
                setSettings((s) => ({ ...s, crmReportingSignOut: v }))
              )}
              <p className="text-[10px] text-gray-500">
                Window: {formatReportingTime(settings.crmReportingSignIn)} –{" "}
                {formatReportingTime(settings.crmReportingSignOut)}
              </p>
            </div>
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
