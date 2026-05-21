"use client";

import { useState } from "react";
import { CalendarClock, Power, Sparkles } from "lucide-react";

import { supabase } from "@/lib/supabase";

export type VisitorAccountSubscriptionInfo = {
  plan: string;
  planLabel: string;
  isActive: boolean;
  isPaid: boolean;
  periodEndsLabel: string;
};

export type VisitorAccountExtensionInfo = {
  active: boolean;
  endsLabel: string;
  plan: string | null;
  note: string | null;
};

type VisitorAccountExtensionControlsProps = {
  userId: string;
  email: string;
  subscription: VisitorAccountSubscriptionInfo;
  extension: VisitorAccountExtensionInfo;
  onUpdated: () => void;
  onError: (message: string) => void;
};

const DAY_OPTIONS = [7, 14, 30, 90] as const;

export default function VisitorAccountExtensionControls({
  userId,
  email,
  subscription,
  extension,
  onUpdated,
  onError,
}: VisitorAccountExtensionControlsProps) {
  const [days, setDays] = useState<number>(7);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"activate" | "revoke" | null>(null);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const postExtension = async (action: "activate" | "revoke") => {
    setBusy(action);
    onError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(
        `/api/visitor-management/accounts/${encodeURIComponent(userId)}/extension`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            action === "activate"
              ? { action: "activate", days, note: note.trim() || undefined }
              : { action: "revoke" }
          ),
        }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      onUpdated();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Could not update extension");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3 min-w-[260px]">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" aria-hidden />
        <div className="text-xs text-gray-700 space-y-1">
          <p className="font-bold text-gray-900">Plan access</p>
          <p>
            Current: <span className="font-semibold">{subscription.planLabel}</span>
            {subscription.isActive ? (
              <span className="text-emerald-700"> · Active</span>
            ) : (
              <span className="text-amber-800"> · Inactive</span>
            )}
            {subscription.isPaid ? (
              <span className="text-gray-500"> (paid)</span>
            ) : null}
          </p>
          {subscription.periodEndsLabel !== "—" ? (
            <p className="text-gray-600">Access until {subscription.periodEndsLabel}</p>
          ) : null}
          {extension.active ? (
            <p className="text-violet-900 font-semibold">
              Admin extension until {extension.endsLabel || "—"}
              {extension.plan ? ` · ${extension.plan}` : ""}
            </p>
          ) : (
            <p className="text-gray-500">No admin extension active</p>
          )}
          {extension.note ? (
            <p className="text-gray-500 italic">Note: {extension.note}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold text-gray-600">
          Days
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={busy !== null}
            className="mt-0.5 block w-full min-w-[88px] rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[120px] text-[11px] font-semibold text-gray-600">
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy !== null}
            placeholder="e.g. Complimentary trial"
            className="mt-0.5 block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <p className="text-[10px] text-gray-500 leading-snug">
        Enterprise unlocks Professional and Real Estate features for {email || "this account"}.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void postExtension("activate")}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          {busy === "activate" ? "Activating…" : extension.active ? "Extend access" : "Activate access"}
        </button>
        {extension.active ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (
                !window.confirm(
                  `Turn off complimentary access for ${email || "this account"}? They will need a paid plan unless still on trial.`
                )
              ) {
                return;
              }
              void postExtension("revoke");
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <Power className="w-3.5 h-3.5" />
            {busy === "revoke" ? "Turning off…" : "Turn off"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
