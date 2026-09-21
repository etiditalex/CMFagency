import { INVOICE_MPESA_ACCOUNT, INVOICE_MPESA_PAYBILL } from "@/lib/invoice-payment-details";

export const INVOICE_ISSUER = {
  name: "Changer Fusions",
  addressLines: ["Ambalal Building, Nkruma Road", "Ambalal, Mombasa", "Kenya"],
  email: "info@cmfagency.co.ke",
  websiteLabel: "cmfagency.co.ke",
  websiteUrl: "https://cmfagency.co.ke",
  helpUrl: "https://cmfagency.co.ke/contact",
} as const;

/** Stripe/Vercel invoice "Pay online" link color */
export const INVOICE_PAY_LINK_COLOR = "#6E5EF7";

export const INVOICE_PAYBILL_LINE = `Paybill: ${INVOICE_MPESA_PAYBILL} / Account: ${INVOICE_MPESA_ACCOUNT}`;

export function formatServiceInvoiceLabel(invoiceNumber: number, year = new Date().getFullYear()): string {
  return `CF-${year}-${String(invoiceNumber).padStart(6, "0")}`;
}

export function formatInvoiceLongDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** Short range like `Sep 21–Oct 20, 2026` (en dash). */
export function formatInvoiceShortRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const startFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    month: "short",
    day: "numeric",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt.format(start)}-${endFmt.format(end)}`;
}

/** First monthly billing window from the invoice issue date. */
export function monthlyBillingRangeFromIssue(issueIso: string): { startIso: string; endIso: string; label: string } {
  const start = new Date(issueIso);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: formatInvoiceShortRange(start.toISOString(), end.toISOString()),
  };
}

export function formatKesMoney(amountKes: number): string {
  const n = Number.isFinite(amountKes) ? amountKes : 0;
  return `KSh ${formatKesTableAmount(n)}`;
}

/** Numeric amount for table/unit columns, e.g. `40,000.00`. */
export function formatKesTableAmount(amountKes: number): string {
  const n = Number.isFinite(amountKes) ? amountKes : 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function invoiceHelpLine(helpUrl = INVOICE_ISSUER.helpUrl): string {
  return `To learn more about or to discuss your invoice, please visit ${helpUrl}`;
}

export function splitAddressLines(address: string | null | undefined): string[] {
  if (!address?.trim()) return [];
  return address
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
