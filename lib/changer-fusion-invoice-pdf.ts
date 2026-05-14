import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { INVOICE_MPESA_ACCOUNT, INVOICE_MPESA_PAYBILL } from "@/lib/invoice-payment-details";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitAmountKes: number;
};

export type BuildChangerFusionInvoicePdfInput = {
  billToName: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  /** Display label, e.g. "Proforma Invoice" */
  documentTitle?: string;
  dueDateIso?: string | null;
  invoiceRef: string;
};

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const M = 50;
const BODY_W = PAGE_W - 2 * M;
const BRAND_GRAY = rgb(0.42, 0.43, 0.45);
const BRAND_DARK = rgb(0.12, 0.12, 0.14);
const ACCENT = rgb(0.08, 0.45, 0.35);

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

function nairobiYmdHms(d: Date): { ymd: string; hms: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  const h = get("hour").padStart(2, "0");
  const mi = get("minute").padStart(2, "0");
  const s = get("second").padStart(2, "0");
  return { ymd: `${y}${mo}${day}`, hms: `${h}${mi}${s}` };
}

/** Filename like `INVOICE FOR MR. JUSTINE _20260504_153039_0000.pdf` */
export function buildInvoicePdfFilename(billToName: string, d = new Date()): string {
  const label = billToName.trim() || "CLIENT";
  const { ymd, hms } = nairobiYmdHms(d);
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INVOICE FOR ${label} _${ymd}_${hms}_${seq}.pdf`;
}

function drawTableHeader(
  page: PDFPage,
  y: number,
  fontBold: PDFFont,
  colDesc: number,
  colQty: number,
  colUnit: number,
  colTot: number,
  continued: boolean
) {
  page.drawRectangle({
    x: M,
    y: y - 22,
    width: BODY_W,
    height: 22,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.85, 0.86, 0.88),
    borderWidth: 0.5,
  });
  page.drawText(continued ? "Description (continued)" : "Description", {
    x: colDesc + 8,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: BRAND_DARK,
  });
  page.drawText("Qty", { x: colQty, y: y - 15, size: 9, font: fontBold, color: BRAND_DARK });
  page.drawText("Unit (KSh)", { x: colUnit, y: y - 15, size: 9, font: fontBold, color: BRAND_DARK });
  const th = "Total (KSh)";
  const thW = fontBold.widthOfTextAtSize(th, 9);
  page.drawText(th, { x: colTot - thW, y: y - 15, size: 9, font: fontBold, color: BRAND_DARK });
}

function addCompanyFooter(page: PDFPage, fontReg: PDFFont) {
  const t = "Thank you for your business · Changer Fusions";
  const w = fontReg.widthOfTextAtSize(t, 8);
  page.drawText(t, { x: (PAGE_W - w) / 2, y: 22, size: 8, font: fontReg, color: BRAND_GRAY });
}

/** Minimum y (pdf-lib: above bottom) before drawing paybill + signature + tagline. */
const MIN_Y_BEFORE_PAYMENT_BLOCK = 132;

function drawPaymentAndSignature(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  invoiceRef: string,
  topY: number
): void {
  let y = topY;
  y -= 6;
  page.drawText("Payment — M-Pesa Paybill", { x: M, y, size: 10, font: fontBold, color: BRAND_DARK });
  y -= 13;
  page.drawText(`Paybill No: ${INVOICE_MPESA_PAYBILL}`, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
  y -= 12;
  page.drawText(`Account No: ${INVOICE_MPESA_ACCOUNT}`, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
  y -= 11;
  const payNote = `Use invoice reference ${invoiceRef} as the payment description / narration where applicable.`;
  for (const ln of wrapLines(payNote, fontReg, 8, BODY_W)) {
    page.drawText(ln, { x: M, y, size: 8, font: fontReg, color: BRAND_GRAY });
    y -= 10;
  }
  y -= 12;
  page.drawText("Authorized signature", { x: M, y, size: 9, font: fontBold, color: BRAND_DARK });
  y -= 6;
  const lineW = 230;
  const lineY = y;
  const lineColor = rgb(0.25, 0.26, 0.28);
  page.drawLine({
    start: { x: M, y: lineY },
    end: { x: M + lineW, y: lineY },
    thickness: 0.6,
    color: lineColor,
  });
  page.drawText("For Changer Fusions", { x: M, y: lineY - 11, size: 8, font: fontReg, color: BRAND_GRAY });

  const dateLineW = 160;
  const dx = PAGE_W - M - dateLineW;
  page.drawLine({
    start: { x: dx, y: lineY },
    end: { x: dx + dateLineW, y: lineY },
    thickness: 0.6,
    color: lineColor,
  });
  page.drawText("Date", { x: dx, y: lineY - 11, size: 8, font: fontReg, color: BRAND_GRAY });
}

export async function buildChangerFusionInvoicePdfBytes(input: BuildChangerFusionInvoicePdfInput): Promise<Uint8Array> {
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
      const maxLogoW = 150;
      const scale = maxLogoW / logoImage.width;
      logoW = maxLogoW;
      logoH = logoImage.height * scale;
    }
  } catch {
    // continue without logo
  }

  let page = doc.addPage([PAGE_W, PAGE_H]);
  const { height: H } = page.getSize();
  let y = H - M;

  if (logoImage) {
    page.drawImage(logoImage, { x: M, y: y - logoH, width: logoW, height: logoH });
    y -= logoH + 18;
  } else {
    page.drawText("Changer Fusions", { x: M, y: y - 18, size: 16, font: fontBold, color: ACCENT });
    y -= 36;
  }

  const companyBlock = ["Changer Fusions", "Digital marketing · Kenya", "Mombasa, Kenya"];
  let ry = H - M - 10;
  for (const ln of companyBlock) {
    const lw = fontReg.widthOfTextAtSize(ln, 9);
    page.drawText(ln, { x: PAGE_W - M - lw, y: ry, size: 9, font: fontReg, color: BRAND_GRAY });
    ry -= 11;
  }

  const docTitle = (input.documentTitle ?? "Proforma Invoice").trim();
  page.drawText(docTitle.toUpperCase(), { x: M, y: y - 8, size: 20, font: fontBold, color: BRAND_DARK });
  y -= 36;

  page.drawText(`Reference ${input.invoiceRef}`, { x: M, y: y, size: 10, font: fontReg, color: BRAND_GRAY });
  y -= 22;

  const boxTop = y;
  const boxH = 72;
  page.drawRectangle({
    x: M,
    y: boxTop - boxH,
    width: BODY_W,
    height: boxH,
    color: rgb(0.94, 0.95, 0.95),
    borderColor: rgb(0.88, 0.89, 0.9),
    borderWidth: 0.5,
  });
  const invDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const due =
    input.dueDateIso && input.dueDateIso.trim()
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Nairobi",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(input.dueDateIso))
      : "—";

  const bx = M + 12;
  let by = boxTop - 22;
  page.drawText(docTitle, { x: bx, y: by, size: 12, font: fontBold, color: BRAND_DARK });
  by -= 18;
  page.drawText(`Invoice date: ${invDate}`, { x: bx, y: by, size: 10, font: fontReg, color: BRAND_DARK });
  page.drawText(`Due date: ${due}`, { x: bx + 260, y: by, size: 10, font: fontReg, color: BRAND_DARK });

  y = boxTop - boxH - 28;

  page.drawText("INVOICED TO", { x: M, y: y, size: 8, font: fontBold, color: ACCENT });
  y -= 16;
  const billName = input.billToName.trim() || "Client";
  page.drawText(billName, { x: M, y: y, size: 11, font: fontBold, color: BRAND_DARK });
  y -= 14;
  if (input.billToAddress?.trim()) {
    for (const line of wrapLines(input.billToAddress, fontReg, 9, BODY_W - 20)) {
      page.drawText(line, { x: M, y: y, size: 9, font: fontReg, color: BRAND_DARK });
      y -= 11;
    }
  }
  if (input.billToEmail?.trim()) {
    page.drawText(input.billToEmail.trim(), { x: M, y: y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
  }
  if (input.billToPhone?.trim()) {
    page.drawText(input.billToPhone.trim(), { x: M, y: y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
  }
  y -= 16;

  const colDesc = M;
  const colQty = M + 280;
  const colUnit = M + 330;
  const colTot = PAGE_W - M - 8;

  drawTableHeader(page, y, fontBold, colDesc, colQty, colUnit, colTot, false);
  y -= 22;

  let subtotal = 0;
  for (const row of input.lineItems) {
    const qty = Math.max(0, Number(row.quantity) || 0);
    const unit = Math.max(0, Math.round(Number(row.unitAmountKes) || 0));
    const lineTotal = Math.round(qty * unit);
    subtotal += lineTotal;

    const descLines = wrapLines(row.description || "Item", fontReg, 9, colQty - colDesc - 16);
    const rowH = Math.max(24, 12 + descLines.length * 11 + 10);
    if (y - rowH < M + 100) {
      addCompanyFooter(page, fontReg);
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = H - M;
      drawTableHeader(page, y, fontBold, colDesc, colQty, colUnit, colTot, true);
      y -= 22;
    }

    page.drawRectangle({
      x: M,
      y: y - rowH,
      width: BODY_W,
      height: rowH,
      borderColor: rgb(0.9, 0.91, 0.92),
      borderWidth: 0.5,
    });
    let dy = y - 14;
    for (const ln of descLines) {
      page.drawText(ln, { x: colDesc + 8, y: dy, size: 9, font: fontReg, color: BRAND_DARK });
      dy -= 11;
    }
    page.drawText(String(qty), { x: colQty, y: y - 14, size: 9, font: fontReg, color: BRAND_DARK });
    page.drawText(unit.toLocaleString("en-KE"), { x: colUnit, y: y - 14, size: 9, font: fontReg, color: BRAND_DARK });
    const totStr = lineTotal.toLocaleString("en-KE");
    const totW = fontReg.widthOfTextAtSize(totStr, 9);
    page.drawText(totStr, { x: colTot - totW - 8, y: y - 14, size: 9, font: fontReg, color: BRAND_DARK });
    y -= rowH;
  }

  const summaryH = 52;
  if (y - summaryH < M + 100) {
    addCompanyFooter(page, fontReg);
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = H - M;
  }

  page.drawRectangle({
    x: M,
    y: y - summaryH,
    width: BODY_W,
    height: summaryH,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.85, 0.86, 0.88),
    borderWidth: 0.5,
  });
  const dueLabel = "Amount due (KSh)";
  const dueLabelW = fontBold.widthOfTextAtSize(dueLabel, 9);
  page.drawText(dueLabel, { x: PAGE_W - M - dueLabelW - 12, y: y - 20, size: 9, font: fontBold, color: BRAND_GRAY });
  const amt = subtotal.toLocaleString("en-KE");
  const amtW = fontBold.widthOfTextAtSize(amt, 16);
  page.drawText(amt, { x: PAGE_W - M - amtW - 12, y: y - 42, size: 16, font: fontBold, color: BRAND_DARK });
  y -= summaryH + 20;

  if (input.notes?.trim()) {
    page.drawText("Notes", { x: M, y: y, size: 9, font: fontBold, color: ACCENT });
    y -= 12;
    for (const ln of wrapLines(input.notes, fontReg, 9, BODY_W)) {
      if (y < M + 60) break;
      page.drawText(ln, { x: M, y: y, size: 9, font: fontReg, color: BRAND_DARK });
      y -= 11;
    }
  }

  const addrLines = [
    "Changer Fusions",
    "Ambalal Building, Nkruma Road",
    "Ambalal, Mombasa, Kenya",
    `Reference on payment: ${input.invoiceRef}`,
  ];
  y = Math.min(y, M + 200);
  for (const ln of addrLines) {
    if (y < M + 48) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = H - M - 16;
    }
    page.drawText(ln, { x: M, y: y, size: 8, font: fontReg, color: BRAND_GRAY });
    y -= 10;
  }

  if (y < MIN_Y_BEFORE_PAYMENT_BLOCK) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = H - M - 8;
    page.drawText(`Changer Fusions · ${input.invoiceRef}`, { x: M, y, size: 9, font: fontReg, color: BRAND_GRAY });
    y -= 20;
  }

  drawPaymentAndSignature(page, fontReg, fontBold, input.invoiceRef, y);

  addCompanyFooter(page, fontReg);

  return doc.save();
}
