import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import ServiceInvoicePayClient from "@/components/service-invoices/ServiceInvoicePayClient";
import ServiceInvoiceToolbar from "@/components/service-invoices/ServiceInvoiceToolbar";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  INVOICE_ISSUER,
  INVOICE_PAYBILL_LINE,
  formatInvoiceLongDate,
  formatKesMoney,
  formatKesTableAmount,
  invoiceHelpLine,
  splitAddressLines,
} from "@/lib/invoice-document";
import { serviceInvoiceLabel, serviceInvoiceLineItem } from "@/lib/service-invoice-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function ServiceInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) notFound();

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: inv, error } = await supabase
    .from("service_invoices")
    .select(
      "id,invoice_number,access_token,package_title,amount_kes,customer_name,customer_email,customer_phone,customer_company,customer_address,status,due_date,paid_at,created_at"
    )
    .eq("access_token", token.trim())
    .maybeSingle();

  if (error || !inv) notFound();

  const row = inv as {
    invoice_number: number;
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

  const paid = row.status === "paid";
  const label = serviceInvoiceLabel(row);
  const issueDate = formatInvoiceLongDate(row.created_at);
  const dueDate = formatInvoiceLongDate(row.due_date);
  const line = serviceInvoiceLineItem(row);
  const money = formatKesMoney(row.amount_kes);
  const amountHeading = paid
    ? `${money} paid${row.paid_at ? ` ${formatInvoiceLongDate(row.paid_at)}` : ""}`
    : `${money} due${dueDate !== "—" ? ` ${dueDate}` : ""}`;

  const billName = row.customer_company?.trim() || row.customer_name;
  const billLines = [
    ...(row.customer_company?.trim() && row.customer_name.trim() && row.customer_company.trim() !== row.customer_name.trim()
      ? [row.customer_name]
      : []),
    ...splitAddressLines(row.customer_address),
    row.customer_email,
    ...(row.customer_phone?.trim() ? [row.customer_phone.trim()] : []),
  ];

  const pdfHref = `/api/service-invoices/pdf?token=${encodeURIComponent(token.trim())}`;

  return (
    <div className="min-h-screen bg-neutral-100 px-0 py-6 sm:px-4 sm:py-10 print:bg-white print:p-0">
      <ServiceInvoiceToolbar pdfHref={pdfHref} />
      <article
        className="invoice-sheet mx-auto w-full max-w-[816px] bg-white px-8 py-10 text-black shadow-sm sm:px-[72px] sm:py-[67px] print:max-w-none print:px-[54pt] print:py-[50pt] print:shadow-none"
        style={{ fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif' }}
      >
        <style>{`@media print { @page { size: letter; margin: 0; } }`}</style>
        <div className="h-[6px] w-full bg-black" />

        <div className="mt-[18px] flex items-start justify-between gap-6">
          <h1 className="text-[22pt] font-bold leading-none tracking-tight">Invoice</h1>
          <Image
            src={BRAND_LOGO_URL}
            alt="Changer Fusions"
            width={45}
            height={45}
            className="h-[45px] w-[45px] object-contain"
            unoptimized
          />
        </div>

        <dl className="mt-[18px] space-y-[2px] text-[10pt] leading-[11.5pt]">
          <div className="grid grid-cols-[7.9rem_1fr] gap-x-2">
            <dt className="font-bold">Invoice number</dt>
            <dd className="font-bold">{label}</dd>
          </div>
          <div className="grid grid-cols-[7.9rem_1fr] gap-x-2">
            <dt className="font-bold">Date of issue</dt>
            <dd>{issueDate}</dd>
          </div>
          <div className="grid grid-cols-[7.9rem_1fr] gap-x-2">
            <dt className="font-bold">Date due</dt>
            <dd>{dueDate}</dd>
          </div>
        </dl>

        <div className="mt-[22px] grid grid-cols-1 gap-8 text-[10pt] leading-[12.5pt] sm:grid-cols-2">
          <div>
            <div className="font-bold">{INVOICE_ISSUER.name}</div>
            {INVOICE_ISSUER.addressLines.map((ln) => (
              <div key={ln}>{ln}</div>
            ))}
            <div>{INVOICE_ISSUER.email}</div>
          </div>
          <div>
            <div className="font-bold">Bill to</div>
            <div>{billName}</div>
            {billLines.map((ln) => (
              <div key={ln}>{ln}</div>
            ))}
          </div>
        </div>

        <h2 className="mt-[34px] text-[14pt] font-bold leading-snug">{amountHeading}</h2>

        <div className="mt-[8px]">
          {paid ? (
            <p className="text-[10pt] text-neutral-700">This invoice has been paid. Thank you.</p>
          ) : (
            <ServiceInvoicePayClient accessToken={token.trim()} customerEmail={row.customer_email} unpaid />
          )}
        </div>

        <p className="mt-[14px] text-[10pt]">{INVOICE_PAYBILL_LINE}</p>

        <table className="mt-[22px] w-full border-collapse text-[10pt]">
          <thead>
            <tr className="border-b-[1.45px] border-black text-[8pt]">
              <th className="pb-1.5 text-left font-normal">Description</th>
              <th className="w-[44px] pb-1.5 text-right font-normal">Qty</th>
              <th className="w-[108px] pb-1.5 text-right font-normal">Unit price</th>
              <th className="w-[108px] pb-1.5 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#ddd]">
              <td className="py-3 pr-4 align-top">
                <div>{line.description}</div>
                {line.subtitle ? <div>{line.subtitle}</div> : null}
              </td>
              <td className="py-3 align-top text-right">{line.quantity}</td>
              <td className="py-3 align-top text-right">{formatKesTableAmount(line.unitAmountKes)}</td>
              <td className="py-3 align-top text-right">{formatKesTableAmount(line.unitAmountKes)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 space-y-[6px] text-[10pt]">
          <div className="flex justify-between gap-6">
            <span>Subtotal</span>
            <span>{formatKesTableAmount(row.amount_kes)}</span>
          </div>
          <div className="flex justify-between gap-6 font-bold">
            <span>Total</span>
            <span>{formatKesTableAmount(row.amount_kes)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span>Amount due</span>
            <span>{money}</span>
          </div>
        </div>

        <p className="mt-8 text-[10pt]">{invoiceHelpLine()}</p>
      </article>
    </div>
  );
}
