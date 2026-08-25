"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Printer, QrCode, ScanLine } from "lucide-react";

import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import { VM_CARD } from "@/components/fusion-xpress/visitor-management/vm-card";
import { downloadReceptionQrPdf } from "@/lib/employees/download-reception-qr-pdf";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import type { EmployeeMemberType } from "@/lib/employees/types";
import { supabase } from "@/lib/supabase";

type GateInfo = {
  memberType: EmployeeMemberType;
  gateToken: string;
};

type ReceptionQrPanelProps = {
  disabled?: boolean;
  isRealEstate?: boolean;
  organizationName?: string;
  canDownloadQr?: boolean;
};

function printGateQr(title: string, svgMarkup: string) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; text-align: center; padding: 32px; color: #1a2332; }
      h1 { font-size: 18px; margin-bottom: 8px; }
      p { color: #64748b; font-size: 13px; }
      .qr { margin: 24px auto; display: inline-block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
    </style></head><body>
    <h1>${title}</h1>
    <p>Fusion Xpress</p>
    <div class="qr">${svgMarkup}</div>
    <script>window.onload = function(){ window.print(); }<\/script>
    </body></html>`);
  w.document.close();
}

export default function ReceptionQrPanel({
  disabled,
  isRealEstate = false,
  organizationName = "",
  canDownloadQr = true,
}: ReceptionQrPanelProps) {
  const [gates, setGates] = useState<GateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [downloading, setDownloading] = useState<EmployeeMemberType | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const qs = isRealEstate ? "?includeCrm=1" : "";
      const res = await fetch(`/api/visitor-employees/reception-gates${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        gates?: GateInfo[];
        setupRequired?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load reception QR codes");
      if (json.setupRequired) {
        setSetupRequired(true);
        setGates([]);
        return;
      }
      setGates(Array.isArray(json.gates) ? json.gates : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getToken, isRealEstate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePdf = async (gate: GateInfo) => {
    setDownloading(gate.memberType);
    try {
      await downloadReceptionQrPdf({
        gateToken: gate.gateToken,
        memberType: gate.memberType,
        organizationName,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = (gate: GateInfo) => {
    const svg = document.querySelector(`#fx-reception-gate-${gate.memberType} svg`);
    if (!svg) return;
    printGateQr(`${memberTypeLabel(gate.memberType)} reception QR`, svg.outerHTML);
  };

  const gateCards = gates.length
    ? gates
    : isRealEstate
      ? [
          { memberType: "staff" as const, gateToken: "" },
          { memberType: "crm" as const, gateToken: "" },
        ]
      : [{ memberType: "staff" as const, gateToken: "" }];

  return (
    <section className={`grid gap-4 ${isRealEstate ? "xl:grid-cols-2" : ""}`}>
      {setupRequired ? (
        <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Run <code className="font-mono text-xs">database/visitor_employees_patch_04_reception_gates.sql</code>{" "}
          in Supabase to enable reception QR codes.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading reception codes…</p>
      ) : (
        gateCards.map((gate) => {
          const label = memberTypeLabel(gate.memberType);
          const hasToken = Boolean(gate.gateToken);
          return (
            <div key={gate.memberType} className={`${VM_CARD} p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <QrCode className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    {isRealEstate ? `${label} reception QR` : "Employee QR code"}
                  </h3>
                  <p className="text-xs text-slate-500">Mount at reception for sign-in and sign-out.</p>
                </div>
              </div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div
                  id={`fx-reception-gate-${gate.memberType}`}
                  className="flex shrink-0 justify-center rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
                >
                  {hasToken ? (
                    <EmployeeQrCode token={gate.gateToken} variant="gate" size={148} showCaption={false} />
                  ) : (
                    <div className="flex h-[148px] w-[148px] items-center justify-center text-center text-xs text-slate-500">
                      Reception QR not set up yet
                    </div>
                  )}
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                    Staff scan this code at the desk, then enter their member ID once to link a phone.
                  </li>
                  <li className="flex gap-2">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                    After linking, each scan records sign-in or sign-out and emails directors.
                  </li>
                </ul>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {canDownloadQr ? (
                  <button
                    type="button"
                    disabled={disabled || setupRequired || !hasToken || downloading === gate.memberType}
                    onClick={() => void handlePdf(gate)}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading === gate.memberType ? "Creating PDF…" : "Download QR"}
                  </button>
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    QR PDF download requires a Professional or Enterprise subscription.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!hasToken}
                  onClick={() => handlePrint(gate)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print QR
                </button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
