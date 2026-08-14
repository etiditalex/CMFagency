import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { INVOICE_MPESA_ACCOUNT, INVOICE_MPESA_PAYBILL } from "@/lib/invoice-payment-details";

export type ReceiptLineItem = {
  description: string;
  quantity: number;
  unitAmountKes: number;
  /** Amount applied to this line from the payment. Defaults to the line invoice total. */
  amountPaidKes?: number;
};

export type BuildChangerFusionReceiptPdfInput = {
  billToName: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  lineItems: ReceiptLineItem[];
  /** Total amount received in this payment (KSh). */
  amountPaidKes: number;
  receiptNumber: string;
  relatedInvoice: string;
  receiptDateIso?: string | null;
  paymentDateIso?: string | null;
  paymentMethod?: string;
  mpesaReference?: string;
  mpesaNumber?: string;
  memo?: string;
  /** Days until remaining balance is due. Default 14. */
  balanceDueDays?: number;
};

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const M = 42;
const BODY_W = PAGE_W - 2 * M;
const RIGHT_COL_W = 232;
const RIGHT_COL_X = PAGE_W - M - RIGHT_COL_W;

const TEXT = rgb(0.102, 0.102, 0.102);
const MUTED = rgb(0.294, 0.333, 0.388);
const TITLE_GRAY = rgb(0.541, 0.561, 0.596);
const FOOTER_GRAY = rgb(0.612, 0.639, 0.686);
const RULE = rgb(0.102, 0.102, 0.102);
const GOLD_FILL = rgb(1, 0.973, 0.925);
const GOLD_BORDER = rgb(0.941, 0.851, 0.659);

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw) return [""];
  const lines: string[] = [];
  for (const para of raw.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxW) {
        cur = trial;
      } else {
        if (cur) lines.push(cur);
        if (font.widthOfTextAtSize(w, size) <= maxW) {
          cur = w;
        } else {
          let chunk = "";
          for (const ch of w) {
            const t2 = chunk + ch;
            if (font.widthOfTextAtSize(t2, size) <= maxW) chunk = t2;
            else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          cur = chunk;
        }
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

function formatKes(n: number): string {
  const v = Math.round(n);
  return `KSh ${v.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseCalendarDate(iso?: string | null, fallback = new Date()): Date {
  const raw = iso?.trim() ?? "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0));
  }
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function formatReceiptDate(iso?: string | null, fallback = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseCalendarDate(iso, fallback));
}

function addDaysIso(iso: string | null | undefined, days: number, fallback = new Date()): Date {
  const d = parseCalendarDate(iso, fallback);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function drawRightText(page: PDFPage, text: string, xRight: number, y: number, size: number, font: PDFFont, color = TEXT) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - w, y, size, font, color });
}

function drawHairline(page: PDFPage, x: number, y: number, w: number) {
  page.drawRectangle({ x, y, width: w, height: 0.7, color: RULE });
}

function addPageFooter(page: PDFPage, fontReg: PDFFont, pageIndex: number, pageCount: number) {
  const t = `${pageIndex} of ${pageCount}`;
  drawRightText(page, t, PAGE_W - M, 28, 9, fontReg, FOOTER_GRAY);
}

export function buildReceiptPdfFilename(receiptNumber: string, billToName: string): string {
  const client = billToName
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 48);
  const ref = receiptNumber.trim().replace(/[\\/:*?"<>|]/g, "-") || "RECEIPT";
  return `Receipt_${ref}_${client || "CLIENT"}.pdf`;
}

export async function buildChangerFusionReceiptPdfBytes(
  input: BuildChangerFusionReceiptPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: PDFImage | null = null;
  let logoW = 0;
  let logoH = 0;
  try {
    const res = await fetch(BRAND_LOGO_URL, { cache: "no-store" });
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      logoImage = await doc.embedPng(buf);
      const maxLogoW = 132;
      const scale = maxLogoW / logoImage.width;
      logoW = maxLogoW;
      logoH = logoImage.height * scale;
    }
  } catch {
    // continue without logo
  }

  const now = new Date();
  const receiptDate = formatReceiptDate(input.receiptDateIso, now);
  const paymentDate = formatReceiptDate(input.paymentDateIso || input.receiptDateIso, now);
  const amountPaid = Math.max(0, Math.round(Number(input.amountPaidKes) || 0));
  const relatedInvoice = input.relatedInvoice.trim();
  const receiptNumber = input.receiptNumber.trim();
  const paymentMethod = (input.paymentMethod ?? "M-Pesa transfer").trim() || "M-Pesa transfer";
  const balanceDueDays = Number.isFinite(input.balanceDueDays) ? Math.max(0, Math.round(input.balanceDueDays as number)) : 14;

  let remainingPaid = amountPaid;
  const rows = input.lineItems.map((row) => {
    const qty = Math.max(0, Number(row.quantity) || 0);
    const unit = Math.max(0, Math.round(Number(row.unitAmountKes) || 0));
    const invoiceTotal = Math.round(qty * unit);
    const explicitPaid = row.amountPaidKes != null && Number.isFinite(Number(row.amountPaidKes));
    const paid = explicitPaid
      ? Math.max(0, Math.round(Number(row.amountPaidKes)))
      : Math.min(invoiceTotal, Math.max(0, remainingPaid));
    remainingPaid = Math.max(0, remainingPaid - paid);
    const desc = (row.description || "Item").trim();
    const [title, ...rest] = desc.split("\n").map((s) => s.trim()).filter(Boolean);
    return {
      title: title || "Item",
      subtitle: rest.join(" ").trim(),
      qty,
      unit,
      invoiceTotal,
      paid,
    };
  });

  const invoiceTotal = rows.reduce((s, r) => s + r.invoiceTotal, 0);
  const balanceDue = Math.max(0, invoiceTotal - amountPaid);
  const dueBy = formatReceiptDate(addDaysIso(input.receiptDateIso, balanceDueDays, now).toISOString(), now);

  const defaultMemo =
    balanceDue > 0
      ? `This receipt confirms partial payment against proforma invoice ${relatedInvoice} issued by Changer Fusions. Please use invoice reference ${relatedInvoice} as the payment description/narration when clearing the outstanding balance.\n\nBalance payable via M-Pesa Paybill No. ${INVOICE_MPESA_PAYBILL}, Account No. ${INVOICE_MPESA_ACCOUNT}.`
      : `This receipt confirms payment against invoice ${relatedInvoice} issued by Changer Fusions.`;
  const memo = (input.memo ?? "").trim() || defaultMemo;

  const colDesc = M;
  const colQty = M + 210;
  const colRateRight = M + 318;
  const colInvTotRight = M + 414;
  const colPaidRight = PAGE_W - M;

  const pages: PDFPage[] = [];
  let page = doc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);
  let y = PAGE_H - 36;

  const ensureSpace = (need: number) => {
    if (y - need >= 48) return;
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - M;
  };

  if (logoImage) {
    page.drawImage(logoImage, { x: M, y: y - logoH, width: logoW, height: logoH });
  }

  const receiptTitle = "RECEIPT";
  const titleSize = 24;
  drawRightText(page, receiptTitle, PAGE_W - M, y - 28, titleSize, fontReg, TITLE_GRAY);

  y -= Math.max(logoH, 36) + 14;

  page.drawText("Changer Fusions", { x: M, y, size: 11, font: fontBold, color: TEXT });
  y -= 14;
  page.drawText("Ambalal Building, Nkruma Road", { x: M, y, size: 10, font: fontReg, color: TEXT });
  y -= 13;
  page.drawText("Ambalal, Mombasa, Kenya", { x: M, y, size: 10, font: fontReg, color: TEXT });
  y -= 28;

  const billStartY = y;
  page.drawText("Bill to:", { x: M, y, size: 10, font: fontBold, color: TEXT });
  y -= 16;
  const billName = input.billToName.trim() || "Client";
  page.drawText(billName, { x: M, y, size: 11, font: fontBold, color: TEXT });
  y -= 14;
  const billMaxW = BODY_W - RIGHT_COL_W - 16;
  if (input.billToAddress?.trim()) {
    for (const ln of wrapLines(input.billToAddress, fontReg, 10, billMaxW)) {
      page.drawText(ln, { x: M, y, size: 10, font: fontReg, color: TEXT });
      y -= 13;
    }
  }
  if (input.billToEmail?.trim()) {
    page.drawText(input.billToEmail.trim(), { x: M, y, size: 10, font: fontReg, color: TEXT });
    y -= 13;
  }
  if (input.billToPhone?.trim()) {
    page.drawText(input.billToPhone.trim(), { x: M, y, size: 10, font: fontReg, color: TEXT });
    y -= 13;
  }
  const billBottomY = y;

  const meta = [
    { label: "Receipt number", value: receiptNumber, highlight: false },
    { label: "Related invoice", value: relatedInvoice || "—", highlight: false },
    { label: "Receipt date", value: receiptDate, highlight: false },
    { label: "Payment date", value: paymentDate, highlight: false },
    { label: "Amount paid", value: formatKes(amountPaid), highlight: true },
  ];

  let my = billStartY;
  const labelX = RIGHT_COL_X;
  const valueRight = PAGE_W - M;
  const rowH = 18;
  for (const row of meta) {
    if (row.highlight) {
      const boxH = 22;
      const boxY = my - 6;
      page.drawRectangle({
        x: labelX - 8,
        y: boxY - 4,
        width: RIGHT_COL_W + 8,
        height: boxH,
        color: GOLD_FILL,
        borderColor: GOLD_BORDER,
        borderWidth: 0.9,
      });
    }
    page.drawText(row.label, { x: labelX, y: my, size: 10, font: fontReg, color: TEXT });
    drawRightText(page, row.value, valueRight, my, 10, row.highlight ? fontBold : fontReg, TEXT);
    my -= rowH;
  }

  y = Math.min(billBottomY, my) - 22;

  const headerY = y;
  page.drawText("Description", { x: colDesc, y: headerY, size: 9, font: fontReg, color: TEXT });
  page.drawText("Quantity", { x: colQty, y: headerY, size: 9, font: fontReg, color: TEXT });
  drawRightText(page, "Rate", colRateRight, headerY, 9, fontReg, TEXT);
  drawRightText(page, "Invoice Total", colInvTotRight, headerY, 9, fontReg, TEXT);
  drawRightText(page, "Amount Paid", colPaidRight, headerY, 9, fontReg, TEXT);
  y -= 8;
  drawHairline(page, M, y, BODY_W);
  y -= 14;

  for (const row of rows) {
    const titleLines = wrapLines(row.title, fontReg, 10, colQty - colDesc - 12);
    const subLines = row.subtitle ? wrapLines(row.subtitle, fontReg, 9, colQty - colDesc - 12) : [];
    const rowNeed = 12 + titleLines.length * 12 + subLines.length * 11 + 10;
    ensureSpace(rowNeed);

    let dy = y;
    for (const ln of titleLines) {
      page.drawText(ln, { x: colDesc, y: dy, size: 10, font: fontReg, color: TEXT });
      dy -= 12;
    }
    for (const ln of subLines) {
      page.drawText(ln, { x: colDesc, y: dy, size: 9, font: fontReg, color: MUTED });
      dy -= 11;
    }

    const numY = y;
    page.drawText(String(row.qty), { x: colQty, y: numY, size: 10, font: fontReg, color: TEXT });
    drawRightText(page, formatKes(row.unit), colRateRight, numY, 10, fontReg, TEXT);
    drawRightText(page, formatKes(row.invoiceTotal), colInvTotRight, numY, 10, fontReg, TEXT);
    drawRightText(page, formatKes(row.paid), colPaidRight, numY, 10, fontReg, TEXT);

    y = Math.min(dy, numY - 12) - 8;
  }

  ensureSpace(72);
  y -= 6;
  const totalsXLabel = colInvTotRight - 92;
  const totals = [
    { label: "Invoice total", value: formatKes(invoiceTotal), bold: false },
    { label: "Amount paid", value: formatKes(amountPaid), bold: false },
    { label: "Balance due", value: formatKes(balanceDue), bold: true },
  ];
  for (const row of totals) {
    page.drawText(row.label, { x: totalsXLabel, y, size: 10, font: row.bold ? fontBold : fontReg, color: TEXT });
    drawRightText(page, row.value, colPaidRight, y, 10, row.bold ? fontBold : fontReg, TEXT);
    y -= 16;
  }

  if (balanceDue > 0) {
    ensureSpace(64);
    y -= 10;
    page.drawText("Balance due", { x: M, y, size: 11, font: fontBold, color: TEXT });
    y -= 15;
    const balCopy = `A balance of ${formatKes(balanceDue)} remains on invoice ${relatedInvoice} and is due within ${balanceDueDays} days of this receipt, by ${dueBy}.`;
    for (const ln of wrapLines(balCopy, fontReg, 10, BODY_W)) {
      ensureSpace(14);
      page.drawText(ln, { x: M, y, size: 10, font: fontReg, color: MUTED });
      y -= 13;
    }
  }

  ensureSpace(80);
  y -= 12;
  page.drawText("Payment received", { x: M, y, size: 11, font: fontBold, color: TEXT });
  y -= 15;
  page.drawText(`Method: ${paymentMethod}`, { x: M, y, size: 10, font: fontReg, color: TEXT });
  y -= 13;
  if (input.mpesaReference?.trim()) {
    page.drawText(`M-Pesa reference: ${input.mpesaReference.trim()}`, { x: M, y, size: 10, font: fontReg, color: TEXT });
    y -= 13;
  }
  if (input.mpesaNumber?.trim()) {
    page.drawText(`Received on M-Pesa number: ${input.mpesaNumber.trim()}`, {
      x: M,
      y,
      size: 10,
      font: fontReg,
      color: TEXT,
    });
    y -= 13;
  }

  if (memo) {
    ensureSpace(48);
    y -= 12;
    page.drawText("Memo:", { x: M, y, size: 11, font: fontBold, color: TEXT });
    y -= 15;
    for (const para of memo.split(/\n+/)) {
      for (const ln of wrapLines(para, fontReg, 10, BODY_W)) {
        ensureSpace(14);
        page.drawText(ln, { x: M, y, size: 10, font: fontReg, color: MUTED });
        y -= 13;
      }
      y -= 4;
    }
  }

  pages.forEach((p, i) => addPageFooter(p, fontReg, i + 1, pages.length));

  return doc.save();
}
