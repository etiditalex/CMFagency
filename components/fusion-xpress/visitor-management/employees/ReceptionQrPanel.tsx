"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";

import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import { downloadReceptionQrPdf } from "@/lib/employees/download-reception-qr-pdf";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import { receptionGateQrPayload } from "@/lib/employees/reception-gate";
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
};

export default function ReceptionQrPanel({
  disabled,
  isRealEstate = false,
  organizationName = "",
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

  const gateCards = gates.length
    ? gates
    : isRealEstate
      ? [
          { memberType: "staff" as const, gateToken: "" },
          { memberType: "crm" as const, gateToken: "" },
        ]
      : [{ memberType: "staff" as const, gateToken: "" }];

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-emerald-100 bg-white/80 flex items-center gap-2">
        <QrCode className="w-4 h-4 text-emerald-700" />
        <span className="text-sm font-bold text-emerald-900">Reception QR (mount at desk)</span>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-emerald-900/90">
          Download one QR per team and mount at reception. When scanned, staff open the{" "}
          <strong>sign-in page</strong> on their phone, pick their name, and sign in or out.
          {isRealEstate ? " Use separate codes for Staff and CRM." : null}
        </p>
        {setupRequired ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Run <code className="font-mono">database/visitor_employees_patch_04_reception_gates.sql</code>{" "}
            in Supabase to enable reception QR codes.
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-gray-500">Loading reception codes…</p>
        ) : (
          <div className={`grid gap-4 ${isRealEstate ? "sm:grid-cols-2" : ""}`}>
            {gateCards.map((gate) => {
              const label = memberTypeLabel(gate.memberType);
              const hasToken = Boolean(gate.gateToken);
              const previewUrl = hasToken
                ? receptionGateQrPayload(gate.gateToken, window.location.origin)
                : "";
              return (
                <div
                  key={gate.memberType}
                  className="rounded-lg border border-white bg-white p-4 flex flex-col items-center gap-3"
                >
                  <p className="text-sm font-bold text-gray-900 w-full text-center">{label} team</p>
                  {hasToken ? (
                    <EmployeeQrCode
                      token={gate.gateToken}
                      variant="gate"
                      size={140}
                      className="[&_span.font-mono]:hidden"
                      employeeName={label}
                    />
                  ) : (
                    <div className="h-[140px] w-[140px] rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 text-center px-2">
                      Run patch 04 in Supabase
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={disabled || setupRequired || !hasToken || downloading === gate.memberType}
                    onClick={() => void handlePdf(gate)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {downloading === gate.memberType ? "Creating PDF…" : `Download ${label} QR PDF`}
                  </button>
                  {hasToken && previewUrl ? (
                    <p className="text-[10px] text-gray-400 text-center break-all">{previewUrl}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
