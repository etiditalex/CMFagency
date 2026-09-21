"use client";

import { useState } from "react";
import PaystackPop from "@paystack/inline-js";

import { INVOICE_PAY_LINK_COLOR } from "@/lib/invoice-document";

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
  const [open, setOpen] = useState(false);

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
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10pt] font-bold underline decoration-[1.1px] underline-offset-2"
        style={{ color: INVOICE_PAY_LINK_COLOR, textDecorationColor: INVOICE_PAY_LINK_COLOR }}
      >
        Pay online
      </button>

      {open ? (
        <div className="mt-3 max-w-md space-y-3 text-[10pt] text-neutral-800">
          {err ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</div> : null}
          {msg ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">{msg}</div>
          ) : null}
          <button
            type="button"
            onClick={() => void payPaystack()}
            disabled={busy !== null}
            className="inline-flex items-center justify-center rounded bg-black px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {busy === "paystack" ? "Opening…" : "Card / mobile money"}
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="mpesa-phone" className="sr-only">
              M-Pesa phone
            </label>
            <input
              id="mpesa-phone"
              type="tel"
              placeholder="254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void payMpesa()}
              disabled={busy !== null}
              className="inline-flex shrink-0 items-center justify-center rounded border border-neutral-800 px-4 py-2 text-[13px] font-semibold text-neutral-900 disabled:opacity-60"
            >
              {busy === "mpesa" ? "Sending…" : "Pay with M-Pesa"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">Receipt email: {customerEmail}</p>
        </div>
      ) : null}
    </div>
  );
}
