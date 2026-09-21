import { formatServiceInvoiceLabel, monthlyBillingRangeFromIssue } from "@/lib/invoice-document";
import type { InvoiceLineItem } from "@/lib/changer-fusion-invoice-pdf";

export type ServiceInvoiceRow = {
  invoice_number: number;
  package_slug: string;
  package_title: string;
  amount_kes: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_company: string | null;
  customer_address: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

export function serviceInvoiceLabel(row: Pick<ServiceInvoiceRow, "invoice_number" | "created_at">): string {
  const year = new Date(row.created_at).getFullYear();
  return formatServiceInvoiceLabel(row.invoice_number, year);
}

export function serviceInvoiceLineItem(row: Pick<ServiceInvoiceRow, "package_title" | "amount_kes" | "created_at">): InvoiceLineItem {
  const period = monthlyBillingRangeFromIssue(row.created_at);
  return {
    description: row.package_title,
    subtitle: period.label,
    quantity: 1,
    unitAmountKes: row.amount_kes,
  };
}

