"use client";

import { useState } from "react";
import PaystackPop from "@paystack/inline-js";

type Props = {
  accessToken: string;
  customerEmail: string;
  unpaid: boolean;
};

export default function ServiceInvoicePayClient({ accessToken, customerEmail, unpaid }: Props) {
  const [busy, setBusy] = useState<"paystack" | "mpesa" | null>(null);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!unpaid) return null;

  const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  const payPaystack = async () => {
    setErr(null);
    setMsg(null);
    setBusy("paystack");
    try {
      const useInline = !!pubKey;
      const res = await fetch("/api/service-invoices/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, inline: useInline }),
      });
      const raw = await res.text();
      let json: {
        authorization_url?: string;
        reference?: string;
        amount_subunit?: number;
        email?: string;
        currency?: string;
        error?: string;
      } = {};
      try {
        if (raw) json = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      if (!res.ok) throw new Error(json.error ?? "Payment could not start");

      if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: pubKey!,
          email: json.email,
          amount: json.amount_subunit,
          currency: json.currency,
          reference: json.reference,
          channels: ["card", "mobile_money"],
          onSuccess: () => {
            window.location.reload();
          },
          onCancel: () => setBusy(null),
        });
        return;
      }
      if (json.authorization_url) {
        window.location.href = json.authorization_url;
        return;
      }
      throw new Error("Missing Paystack redirect URL");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const payMpesa = async () => {
    setErr(null);
    setMsg(null);
    const p = phone.trim().replace(/\s/g, "");
    if (!p) {
      setErr("Enter your M-Pesa phone number.");
      return;
    }
    setBusy("mpesa");
    try {
      const res = await fetch("/api/service-invoices/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, phone: p }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? "M-Pesa could not start");
      setMsg(json.message ?? "Check your phone for the STK prompt.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "M-Pesa failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <h3 className="text-lg font-extrabold text-gray-900">Pay now</h3>
      <p className="mt-2 text-sm text-gray-600">
        Card or mobile money via Paystack, or M-Pesa STK. You can return to this link from your email anytime until paid.
      </p>
      {err ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}
      {msg ? (
        <div className="mt-4 rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 text-sm text-secondary-900">
          {msg}
        </div>
      ) : null}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void payPaystack()}
          disabled={busy !== null}
          className="btn-secondary inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-bold uppercase tracking-wide disabled:opacity-60"
        >
          {busy === "paystack" ? "Opening…" : "Pay with Paystack"}
        </button>
        <div className="flex min-w-[280px] flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="mpesa-phone" className="sr-only">
              M-Pesa phone
            </label>
            <input
              id="mpesa-phone"
              type="tel"
              placeholder="254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25"
            />
          </div>
          <button
            type="button"
            onClick={() => void payMpesa()}
            disabled={busy !== null}
            className="inline-flex items-center justify-center rounded-lg border-2 border-secondary-600 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-secondary-800 hover:bg-secondary-50 disabled:opacity-60"
          >
            {busy === "mpesa" ? "Sending…" : "Pay with M-Pesa"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">Receipt email: {customerEmail}</p>
    </div>
  );
}
