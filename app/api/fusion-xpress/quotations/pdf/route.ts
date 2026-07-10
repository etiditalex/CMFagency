import { NextRequest, NextResponse } from "next/server";

import {
  buildChangerFusionQuotationPdfBytes,
  buildQuotationPdfFilename,
  type QuotationLineItem,
} from "@/lib/changer-fusion-quotation-pdf";
import { requireFusionPortalInvoiceAccess } from "@/lib/fusion-require-admin";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 25;
const MAX_DESC = 400;
const MAX_NOTES = 1200;

function sanitizeFilenameLabel(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
}

type QuotationPdfRequestBody = {
  billToName?: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  lineItems?: QuotationLineItem[];
  notes?: string;
  documentTitle?: string;
  dueDateIso?: string | null;
};

export async function POST(req: NextRequest) {
  const auth = await requireFusionPortalInvoiceAccess(req);
  if ("error" in auth) return auth.error;

  let payload: QuotationPdfRequestBody;
  try {
    payload = (await req.json()) as QuotationPdfRequestBody;
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

  const cleaned: QuotationLineItem[] = [];
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
      return NextResponse.json({ error: "Each line item needs a valid unit amount (KSh)" }, { status: 400 });
    }
    cleaned.push({ description, quantity, unitAmountKes });
  }

  const notes = String(payload.notes ?? "").trim().slice(0, MAX_NOTES) || undefined;
  const documentTitle = String(payload.documentTitle ?? "Quotation").trim().slice(0, 80) || "Quotation";
  const dueRaw = payload.dueDateIso != null ? String(payload.dueDateIso).trim() : "";
  const dueDateIso = dueRaw ? dueRaw : null;

  const now = new Date();
  const y = now.getFullYear();
  const quotationRef = `QT-${y}-${String(Math.floor(Math.random() * 900000) + 100000)}`;

  const pdfBytes = await buildChangerFusionQuotationPdfBytes({
    billToName,
    billToEmail: String(payload.billToEmail ?? "").trim() || undefined,
    billToPhone: String(payload.billToPhone ?? "").trim() || undefined,
    billToAddress: String(payload.billToAddress ?? "").trim() || undefined,
    lineItems: cleaned,
    notes,
    documentTitle,
    dueDateIso,
    quotationRef,
  });

  const safeLabel = sanitizeFilenameLabel(billToName);
  const filename = buildQuotationPdfFilename(safeLabel || "CLIENT", now);

  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);

  const pdfBuffer = Buffer.from(pdfBytes);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallback.replace(/"/g, "")}"; filename*=UTF-8''${star}`,
      "Cache-Control": "no-store",
      "X-Quotation-Reference": quotationRef,
    },
  });
}
