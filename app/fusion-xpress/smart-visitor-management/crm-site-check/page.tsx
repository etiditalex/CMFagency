"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, LogOut, MapPin, XCircle } from "lucide-react";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  browserDeviceLabel,
  getOrCreateBrowserDeviceId,
} from "@/lib/employees/device-fingerprint";
import type { CrmSiteVisitRecord } from "@/lib/employees/crm-site-types";
import { formatEmployeeTimestamp } from "@/lib/employees/utils";

type ProjectOption = {
  id: string;
  name: string;
  suburb: string;
  state: string;
};

type PagePhase =
  | { kind: "loading" }
  | {
      kind: "ready";
      employeeName: string;
      openVisit: CrmSiteVisitRecord | null;
      projects: ProjectOption[];
    }
  | { kind: "error"; message: string }
  | {
      kind: "done";
      ok: boolean;
      action?: "sign_in" | "sign_out";
      projectName?: string;
      occurredAt?: string;
      message: string;
    };

export default function CrmSiteCheckPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  const [phase, setPhase] = useState<PagePhase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [customProjectName, setCustomProjectName] = useState("");

  const loadStatus = useCallback(async (qrToken: string) => {
    if (!qrToken) {
      setPhase({
        kind: "error",
        message: "Invalid CRM link. Ask your manager for your site visit QR pass.",
      });
      return;
    }

    setPhase({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/visitor-employees/crm-site-visits/status?token=${encodeURIComponent(qrToken)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        employee?: { fullName: string };
        openVisit?: CrmSiteVisitRecord | null;
        projects?: ProjectOption[];
        error?: string;
        setupRequired?: boolean;
      };
      if (!res.ok) {
        setPhase({ kind: "error", message: json.error ?? "Could not load your pass." });
        return;
      }
      if (json.setupRequired) {
        setPhase({
          kind: "error",
          message: "CRM site GPS is not set up yet. Ask your organisation admin to enable it.",
        });
        return;
      }
      setPhase({
        kind: "ready",
        employeeName: json.employee?.fullName ?? "CRM",
        openVisit: json.openVisit ?? null,
        projects: json.projects ?? [],
      });
    } catch (e: unknown) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, []);

  useEffect(() => {
    void loadStatus(token);
  }, [token, loadStatus]);

  const runScan = useCallback(
    async (action: "sign_in" | "sign_out", project?: { projectId?: string; projectName?: string }) => {
      if (!token) return;
      setSubmitting(true);
      try {
        let latitude: number;
        let longitude: number;
        let accuracyMeters: number;
        try {
          const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
          const pos = await getBrowserPosition();
          latitude = pos.latitude;
          longitude = pos.longitude;
          accuracyMeters = pos.accuracyMeters;
        } catch (e: unknown) {
          setPhase({
            kind: "done",
            ok: false,
            message:
              e instanceof Error
                ? e.message
                : "Location is required to record a site visit. Enable GPS and try again.",
          });
          return;
        }

        const res = await fetch("/api/visitor-employees/crm-site-visits/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action,
            latitude,
            longitude,
            accuracyMeters,
            deviceId: getOrCreateBrowserDeviceId(),
            deviceLabel: browserDeviceLabel(),
            projectId: project?.projectId,
            projectName: project?.projectName,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          action?: "sign_in" | "sign_out";
          visit?: CrmSiteVisitRecord;
          error?: string;
        };

        if (!res.ok) {
          setPhase({
            kind: "done",
            ok: false,
            message: json.error ?? "Could not record site visit.",
          });
          return;
        }

        const at =
          json.action === "sign_out"
            ? json.visit?.signOutAt
            : json.visit?.signInAt;
        setPhase({
          kind: "done",
          ok: true,
          action: json.action,
          projectName: json.visit?.projectName,
          occurredAt: at ?? undefined,
          message:
            json.action === "sign_in"
              ? `Signed in at ${json.visit?.projectName ?? "site"}. Sign out when you leave for the next project.`
              : `Signed out from ${json.visit?.projectName ?? "site"}. Open this page again at your next project.`,
        });
      } catch (e: unknown) {
        setPhase({
          kind: "done",
          ok: false,
          message: e instanceof Error ? e.message : "Network error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [token]
  );

  const ready = phase.kind === "ready" ? phase : null;
  const done = phase.kind === "done" ? phase : null;
  const onSite = Boolean(ready?.openVisit);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customProjectName.trim();
    if (projectId) {
      void runScan("sign_in", { projectId });
    } else if (name) {
      void runScan("sign_in", { projectName: name });
    }
  };

  return (
    <main className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-md flex items-center justify-between gap-3">
          <Image src={BRAND_LOGO_URL} alt="Fusion Xpress" width={120} height={36} className="h-8 w-auto" />
          <Link
            href="/fusion-xpress/smart-visitor-management/sign-in"
            className="text-xs font-semibold text-primary-700 hover:underline"
          >
            Account sign in
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1 text-center">
            CRM site GPS
          </p>
          <h1 className="text-lg font-extrabold text-gray-900 text-center mb-1">Project site visit</h1>
          <p className="text-center text-sm text-gray-500 mb-4 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Live location recorded at sign-in and sign-out
          </p>

          {phase.kind === "loading" || submitting ? (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
              <p className="text-sm font-medium">
                {submitting ? "Capturing GPS location…" : "Loading…"}
              </p>
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <div className="py-4 space-y-3 text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{phase.message}</p>
            </div>
          ) : null}

          {ready && !done ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-700">
                Hello, <strong>{ready.employeeName}</strong>
              </p>
              {onSite && ready.openVisit ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-bold">On site: {ready.openVisit.projectName}</p>
                  <p className="text-xs mt-1 text-amber-800">
                    Signed in {formatEmployeeTimestamp(ready.openVisit.signInAt)}
                  </p>
                  <p className="text-xs mt-2 text-amber-900">
                    GPS: {ready.openVisit.signInLatitude.toFixed(5)},{" "}
                    {ready.openVisit.signInLongitude.toFixed(5)}
                  </p>
                </div>
              ) : null}

              {onSite ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void runScan("sign_out")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out from this site
                </button>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    Select a project or enter the site name, then sign in. Your phone&apos;s GPS pin is
                    saved for this visit.
                  </p>
                  {ready.projects.length > 0 ? (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-600 tracking-wide">
                        Project
                      </span>
                      <select
                        value={projectId}
                        onChange={(e) => {
                          setProjectId(e.target.value);
                          if (e.target.value) setCustomProjectName("");
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">— Choose or type below —</option>
                        {ready.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.suburb ? ` (${p.suburb})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {!projectId ? (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-600 tracking-wide">
                        Site / project name
                      </span>
                      <input
                        type="text"
                        value={customProjectName}
                        onChange={(e) => setCustomProjectName(e.target.value)}
                        placeholder="e.g. Riverside Apartments Phase 2"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        required={ready.projects.length === 0}
                      />
                    </label>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting || (!projectId && !customProjectName.trim())}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in at site
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {done ? (
            <div className="py-4 space-y-4 text-center">
              {done.ok ? (
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto text-red-500" />
              )}
              <p className={`text-sm font-medium ${done.ok ? "text-emerald-800" : "text-red-700"}`}>
                {done.message}
              </p>
              {done.projectName && done.occurredAt ? (
                <p className="text-xs text-gray-500">
                  {done.projectName} · {formatEmployeeTimestamp(done.occurredAt)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void loadStatus(token)}
                className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                Continue
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
