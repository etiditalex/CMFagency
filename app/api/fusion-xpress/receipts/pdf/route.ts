import { NextRequest, NextResponse } from "next/server";

import {
  buildChangerFusionReceiptPdfBytes,
  buildReceiptPdfFilename,
  type ReceiptLineItem,
} from "@/lib/changer-fusion-receipt-pdf";
import { requireFusionPortalInvoiceAccess } from "@/lib/fusion-require-admin";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 25;
const MAX_DESC = 400;
const MAX_MEMO = 1600;

function sanitizeFilenameLabel(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
}

type ReceiptPdfRequestBody = {
  billToName?: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  lineItems?: ReceiptLineItem[];
  amountPaidKes?: number;
  relatedInvoice?: string;
  receiptDateIso?: string | null;
  paymentDateIso?: string | null;
  paymentMethod?: string;
  mpesaReference?: string;
  mpesaNumber?: string;
  memo?: string;
  balanceDueDays?: number;
};

export async function POST(req: NextRequest) {
  const auth = await requireFusionPortalInvoiceAccess(req);
  if ("error" in auth) return auth.error;

  let payload: ReceiptPdfRequestBody;
  try {
    payload = (await req.json()) as ReceiptPdfRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const billToName = String(payload.billToName ?? "").trim();
  if (!billToName) {
    return NextResponse.json({ error: "billToName is required" }, { status: 400 });
  }

  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
  if (lineItems.length === 0 || lineItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Provide between 1 and ${MAX_ITEMS} line items` }, { status: 400 });
  }

  const cleaned: ReceiptLineItem[] = [];
  let invoiceTotal = 0;
  for (const row of lineItems) {
    const description = String(row?.description ?? "").trim().slice(0, MAX_DESC);
    const quantity = Number(row?.quantity);
    const unitAmountKes = Number(row?.unitAmountKes);
    if (!description) {
      return NextResponse.json({ error: "Each line item needs a description" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Each line item needs a positive quantity" }, { status: 400 });
    }
    if (!Number.isFinite(unitAmountKes) || unitAmountKes < 0) {
      return NextResponse.json({ error: "Each line item needs a valid rate (KSh)" }, { status: 400 });
    }
    const lineTotal = Math.round(quantity * Math.round(unitAmountKes));
    invoiceTotal += lineTotal;
    const paidRaw = row?.amountPaidKes;
    const linePaid = paidRaw == null ? undefined : Number(paidRaw);
    if (linePaid != null && (!Number.isFinite(linePaid) || linePaid < 0)) {
      return NextResponse.json({ error: "Each line amount paid must be a valid KSh amount" }, { status: 400 });
    }
    cleaned.push({
      description,
      quantity,
      unitAmountKes: Math.round(unitAmountKes),
      amountPaidKes: linePaid != null ? Math.round(linePaid) : undefined,
    });
  }

  const amountPaidKes = Number(payload.amountPaidKes);
  if (!Number.isFinite(amountPaidKes) || amountPaidKes < 0) {
    return NextResponse.json({ error: "Amount paid is required" }, { status: 400 });
  }
  if (Math.round(amountPaidKes) > invoiceTotal) {
    return NextResponse.json({ error: "Amount paid cannot exceed the invoice total" }, { status: 400 });
  }

  const now = new Date();
  const y = now.getFullYear();
  const relatedRaw = String(payload.relatedInvoice ?? "").trim();
  const relatedInvoice = relatedRaw || `CF-${y}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
  const receiptNumber = relatedRaw && /R\d+$/i.test(relatedRaw) ? relatedRaw : `${relatedInvoice}-R1`;

  const memo = String(payload.memo ?? "").trim().slice(0, MAX_MEMO) || undefined;
  const dueDaysRaw = Number(payload.balanceDueDays);
  const balanceDueDays = Number.isFinite(dueDaysRaw) ? Math.max(0, Math.round(dueDaysRaw)) : 14;

  const pdfBytes = await buildChangerFusionReceiptPdfBytes({
    billToName,
    billToEmail: String(payload.billToEmail ?? "").trim() || undefined,
    billToPhone: String(payload.billToPhone ?? "").trim() || undefined,
    billToAddress: String(payload.billToAddress ?? "").trim() || undefined,
    lineItems: cleaned,
    amountPaidKes: Math.round(amountPaidKes),
    receiptNumber,
    relatedInvoice,
    receiptDateIso: payload.receiptDateIso != null ? String(payload.receiptDateIso).trim() || null : null,
    paymentDateIso: payload.paymentDateIso != null ? String(payload.paymentDateIso).trim() || null : null,
    paymentMethod: String(payload.paymentMethod ?? "").trim() || undefined,
    mpesaReference: String(payload.mpesaReference ?? "").trim() || undefined,
    mpesaNumber: String(payload.mpesaNumber ?? "").trim() || undefined,
    memo,
    balanceDueDays,
  });

  const safeLabel = sanitizeFilenameLabel(billToName);
  const filename = buildReceiptPdfFilename(receiptNumber, safeLabel || "CLIENT");
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);

  const pdfBuffer = Buffer.from(pdfBytes);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallback.replace(/"/g, "")}"; filename*=UTF-8''${star}`,
      "Cache-Control": "no-store",
      "X-Receipt-Number": receiptNumber,
      "X-Related-Invoice": relatedInvoice,
    },
  });
}
