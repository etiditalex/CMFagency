"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DARAJA_CLIENT_VERIFY_MIN_AGE_MS } from "@/lib/daraja-stk-result";

/**
 * Polls transaction status while the server page shows "Confirming your payment",
 * nudging Paystack/M-Pesa verify when pending, then refreshes the RSC tree on success.
 */
export default function ReceiptConfirmingPoller({ paymentRef }: { paymentRef: string }) {
  const router = useRouter();
  const startedAtRef = useRef(Date.now());
  const receiptRequestedRef = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const tick = async () => {
      try {
        let res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(paymentRef)}&lite=1`);
        if (!res.ok) return;
        let json = (await res.json()) as { status?: string; provider?: string };

        if (
          String(json.status ?? "pending") === "pending" &&
          String(json.provider ?? "").toLowerCase() === "paystack"
        ) {
          await fetch("/api/paystack/verify-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: paymentRef }),
          }).catch(() => {});
          res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(paymentRef)}&lite=1`);
          if (!res.ok) return;
          json = (await res.json()) as { status?: string; provider?: string };
        }

        if (
          String(json.status ?? "pending") === "pending" &&
          String(json.provider ?? "").toLowerCase() === "daraja" &&
          Date.now() - startedAtRef.current >= DARAJA_CLIENT_VERIFY_MIN_AGE_MS
        ) {
          await fetch("/api/daraja/verify-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: paymentRef }),
          }).catch(() => {});
          res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(paymentRef)}&lite=1`);
          if (!res.ok) return;
          json = (await res.json()) as { status?: string };
        }

        const st = String(json.status ?? "pending");
        if (st === "success") {
          if (!receiptRequestedRef.current) {
            receiptRequestedRef.current = true;
            fetch(`/api/send-receipt?ref=${encodeURIComponent(paymentRef)}`, { method: "POST" }).catch(() => {});
          }
          router.refresh();
          clearInterval(interval);
        } else if (st === "failed" || st === "abandoned") {
          router.refresh();
          clearInterval(interval);
        }
      } catch {
        /* non-fatal */
      }
    };

    tick();
    interval = setInterval(tick, 2000);
    const stop = setTimeout(() => clearInterval(interval), 300_000);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [paymentRef, router]);

  return null;
}
