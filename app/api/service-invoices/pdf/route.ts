import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  buildChangerFusionInvoicePdfBytes,
  buildServiceInvoicePdfFilename,
} from "@/lib/changer-fusion-invoice-pdf";
import { serviceInvoiceLabel, serviceInvoiceLineItem } from "@/lib/service-invoice-view";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { data: inv, error } = await supabase
    .from("service_invoices")
    .select(
      "invoice_number,package_title,amount_kes,customer_name,customer_email,customer_phone,customer_company,customer_address,status,due_date,created_at,access_token"
    )
    .eq("access_token", token)
    .maybeSingle();

  if (error || !inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

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
    created_at: string;
    access_token: string;
  };

  const invoiceRef = serviceInvoiceLabel(row);
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const payUrl = `${siteBase}/invoice/${row.access_token}`;
  const billToName = (row.customer_company?.trim() || row.customer_name).trim();

  const pdfBytes = await buildChangerFusionInvoicePdfBytes({
    billToName,
    billToEmail: row.customer_email,
    billToPhone: row.customer_phone ?? undefined,
    billToAddress: [
      row.customer_company?.trim() && row.customer_company.trim() !== billToName ? row.customer_name : "",
      row.customer_address ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    lineItems: [serviceInvoiceLineItem(row)],
    documentTitle: "Invoice",
    dueDateIso: row.due_date,
    issueDateIso: row.created_at,
    invoiceRef,
    payUrl,
    paid: row.status === "paid",
  });

  const filename = buildServiceInvoicePdfFilename(invoiceRef);
  const pdfBuffer = Buffer.from(pdfBytes);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Invoice-Reference": invoiceRef,
    },
  });
}
