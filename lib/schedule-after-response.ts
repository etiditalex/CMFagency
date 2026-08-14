import { after } from "next/server";

/**
 * Continue work after the HTTP response is sent (Next.js `after` / Vercel waitUntil).
 * Keeps Paystack/Daraja webhooks fast so they ACK instead of timing out on SMTP.
 */
export function runAfterResponse(task: () => Promise<void>, logPrefix = "[after]"): void {
  const wrapped = async () => {
    try {
      await task();
    } catch (e) {
      console.warn(logPrefix, e instanceof Error ? e.message : e);
    }
  };
  try {
    after(wrapped);
  } catch {
    void wrapped();
  }
}
