import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

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

export type InvoiceLineItem = {
  description: string;
  /** Second line under the description (e.g. billing period). */
  subtitle?: string;
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
  /** Display title in the header. Default: "Invoice" */
  documentTitle?: string;
  dueDateIso?: string | null;
  issueDateIso?: string | null;
  invoiceRef: string;
  /** When set, "Pay online" is drawn as a purple link. */
  payUrl?: string;
  paid?: boolean;
  extraMetaLine?: string;
};

/** US Letter — matches the reference invoice page size. */
const PAGE_W = 612;
const PAGE_H = 792;
const M_LEFT = 54;
const CONTENT_RIGHT = 558.1;
const DESC_COL_RIGHT = 378.07;
const QTY_COL_RIGHT = 423.07;
const UNIT_COL_RIGHT = 490.65;
const AMT_COL_RIGHT = 558.1;
const ROW_H = 39;
const BOTTOM_SAFE = 48;

const BLACK = rgb(0, 0, 0);
const RULE_GRAY = rgb(0.867, 0.867, 0.867);
const PAY_PURPLE = rgb(0.431, 0.369, 0.969);

function pdfSafe(text: string): string {
  return text
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u00B7|\u2022/g, "/")
    .replace(/\u2018|\u2019|\u02BC/g, "'")
    .replace(/\u201C|\u201D/g, '"');
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const raw = pdfSafe(text).replace(/\r\n/g, "\n").trim();
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

export function buildServiceInvoicePdfFilename(invoiceRef: string): string {
  const safe = invoiceRef.replace(/[\\/:*?"<>|]/g, "-").trim() || "invoice";
  return `Invoice-${safe}.pdf`;
}

function pdfYFromTop(yDown: number): number {
  return PAGE_H - yDown;
}

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  baselineY: number,
  size: number,
  font: PDFFont,
  color = BLACK
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - w, y: baselineY, size, font, color });
}

function drawHRule(page: PDFPage, yDown: number, color: typeof BLACK | typeof RULE_GRAY, thickness: number) {
  const y = pdfYFromTop(yDown) - thickness / 2;
  page.drawRectangle({
    x: M_LEFT,
    y,
    width: CONTENT_RIGHT - M_LEFT,
    height: thickness,
    color,
  });
}

function addUriLink(page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  const annot = page.doc.context.register(
    page.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    })
  );
  page.node.addAnnot(annot);
}

function drawTableHeader(page: PDFPage, fontReg: PDFFont, yDownHeaderBaseline: number) {
  const size = 8;
  const baseline = pdfYFromTop(yDownHeaderBaseline);
  page.drawText("Description", { x: M_LEFT, y: baseline, size, font: fontReg, color: BLACK });
  drawRight(page, "Qty", QTY_COL_RIGHT, baseline, size, fontReg);
  drawRight(page, "Unit price", UNIT_COL_RIGHT, baseline, size, fontReg);
  drawRight(page, "Amount", AMT_COL_RIGHT, baseline, size, fontReg);
  drawHRule(page, yDownHeaderBaseline + 6.5, BLACK, 1.44);
}

type DrawnFonts = { fontReg: PDFFont; fontBold: PDFFont };

function ensureRoom(
  doc: PDFDocument,
  pageRef: { page: PDFPage },
  yDown: number,
  need: number,
  fonts: DrawnFonts,
  continued: boolean
): number {
  if (yDown + need <= PAGE_H - BOTTOM_SAFE) return yDown;
  const { page } = pageRef;
  pageRef.page = doc.addPage([PAGE_W, PAGE_H]);
  let next = 57.4;
  if (continued) {
    drawTableHeader(pageRef.page, fonts.fontReg, next);
    next += 21.2;
  }
  void page;
  return next;
}

export async function buildChangerFusionInvoicePdfBytes(input: BuildChangerFusionInvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts: DrawnFonts = { fontReg, fontBold };

  let logoImage: PDFImage | null = null;
  try {
    const res = await fetch(BRAND_LOGO_URL, { cache: "no-store" });
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      logoImage = await doc.embedPng(buf);
    }
  } catch {
    // continue without logo
  }

  const pageRef = { page: doc.addPage([PAGE_W, PAGE_H]) };
  let page = pageRef.page;

  // Top black bar
  page.drawRectangle({
    x: 52.56,
    y: pdfYFromTop(56.04),
    width: 559.54 - 52.56,
    height: 6,
    color: BLACK,
  });

  const title = (input.documentTitle ?? "Invoice").trim() || "Invoice";
  page.drawText(title, {
    x: M_LEFT,
    y: pdfYFromTop(89.2),
    size: 22,
    font: fontBold,
    color: BLACK,
  });

  if (logoImage) {
    const box = 45;
    const scale = Math.min(box / logoImage.width, box / logoImage.height);
    const w = logoImage.width * scale;
    const h = logoImage.height * scale;
    const x = 513 + (45 - w) / 2;
    const y = pdfYFromTop(113.5) + (45 - h) / 2;
    page.drawImage(logoImage, { x, y, width: w, height: h });
  }

  const issueDate = formatInvoiceLongDate(input.issueDateIso ?? new Date());
  const dueDate = formatInvoiceLongDate(input.dueDateIso);

  const meta = [
    { label: "Invoice number", value: input.invoiceRef, valueBold: true },
    { label: "Date of issue", value: issueDate, valueBold: false },
    { label: "Date due", value: dueDate, valueBold: false },
  ];
  let yDown = 112.9;
  for (const row of meta) {
    page.drawText(row.label, { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font: fontBold, color: BLACK });
    page.drawText(row.value, {
      x: 139,
      y: pdfYFromTop(yDown),
      size: 10,
      font: row.valueBold ? fontBold : fontReg,
      color: BLACK,
    });
    yDown += 11.55;
  }

  yDown = 169;
  const sellerLines: { text: string; bold: boolean }[] = [
    { text: INVOICE_ISSUER.name, bold: true },
    ...INVOICE_ISSUER.addressLines.map((t) => ({ text: t, bold: false })),
    { text: INVOICE_ISSUER.email, bold: false },
  ];
  let sy = yDown;
  for (const ln of sellerLines) {
    page.drawText(ln.text, {
      x: M_LEFT,
      y: pdfYFromTop(sy),
      size: 10,
      font: ln.bold ? fontBold : fontReg,
      color: BLACK,
    });
    sy += 12.55;
  }

  const billLines: { text: string; bold: boolean }[] = [{ text: "Bill to", bold: true }];
  const billName = input.billToName.trim() || "Client";
  billLines.push({ text: billName, bold: false });
  for (const ln of splitAddressLines(input.billToAddress)) {
    billLines.push({ text: ln, bold: false });
  }
  if (input.billToEmail?.trim()) billLines.push({ text: input.billToEmail.trim(), bold: false });
  if (input.billToPhone?.trim()) billLines.push({ text: input.billToPhone.trim(), bold: false });

  const billX = 254.1;
  let by = yDown;
  for (const ln of billLines) {
    const wrapped = wrapLines(ln.text, ln.bold ? fontBold : fontReg, 10, CONTENT_RIGHT - billX);
    for (const w of wrapped) {
      page.drawText(w, {
        x: billX,
        y: pdfYFromTop(by),
        size: 10,
        font: ln.bold ? fontBold : fontReg,
        color: BLACK,
      });
      by += 12.55;
    }
  }

  yDown = Math.max(sy, by) + 34;

  let subtotal = 0;
  for (const row of input.lineItems) {
    const qty = Math.max(0, Number(row.quantity) || 0);
    const unit = Math.max(0, Number(row.unitAmountKes) || 0);
    subtotal += qty * unit;
  }

  const dueLabel = formatInvoiceLongDate(input.dueDateIso);
  const amountHeading = input.paid
    ? `${formatKesMoney(subtotal)} paid${dueLabel !== "—" ? ` ${dueLabel}` : ""}`
    : `${formatKesMoney(subtotal)} due${dueLabel !== "—" ? ` ${dueLabel}` : ""}`;

  page.drawText(amountHeading, {
    x: M_LEFT,
    y: pdfYFromTop(yDown),
    size: 14,
    font: fontBold,
    color: BLACK,
  });
  yDown += 20.4;

  if (!input.paid && input.payUrl?.trim()) {
    const label = "Pay online";
    const size = 10;
    const w = fontBold.widthOfTextAtSize(label, size);
    const baseline = pdfYFromTop(yDown);
    page.drawText(label, { x: M_LEFT, y: baseline, size, font: fontBold, color: PAY_PURPLE });
    page.drawRectangle({
      x: M_LEFT,
      y: baseline - 1.2,
      width: w,
      height: 1.08,
      color: PAY_PURPLE,
    });
    addUriLink(page, M_LEFT, baseline - 3, w, 14, input.payUrl.trim());
    yDown += 21.6;
  }

  const extra = (input.extraMetaLine ?? INVOICE_PAYBILL_LINE).trim();
  if (extra) {
    page.drawText(extra, { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font: fontReg, color: BLACK });
    yDown += 23.5;
  }

  drawTableHeader(page, fontReg, yDown);
  yDown += 21.2;

  const descMaxW = DESC_COL_RIGHT - M_LEFT - 4;

  const formatQty = (qty: number) => {
    if (Number.isInteger(qty)) return String(qty);
    return qty.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  for (const row of input.lineItems) {
    const qty = Math.max(0, Number(row.quantity) || 0);
    const unit = Math.max(0, Number(row.unitAmountKes) || 0);
    const lineTotal = qty * unit;
    const descLines = wrapLines(row.description || "Item", fontReg, 10, descMaxW);
    const subLines = row.subtitle?.trim() ? wrapLines(row.subtitle.trim(), fontReg, 10, descMaxW) : [];
    const textLines = descLines.length + subLines.length;
    const need = Math.max(ROW_H, 16 + (textLines - 1) * 13.5 + 12);

    yDown = ensureRoom(doc, pageRef, yDown, need, fonts, true);
    page = pageRef.page;

    const titleBaseline = pdfYFromTop(yDown);
    let dy = yDown;
    for (const ln of descLines) {
      page.drawText(ln, { x: M_LEFT, y: pdfYFromTop(dy), size: 10, font: fontReg, color: BLACK });
      dy += 13.5;
    }
    for (const ln of subLines) {
      page.drawText(ln, { x: M_LEFT, y: pdfYFromTop(dy), size: 10, font: fontReg, color: BLACK });
      dy += 13.5;
    }

    page.drawText(formatQty(qty), {
      x: QTY_COL_RIGHT - fontReg.widthOfTextAtSize(formatQty(qty), 10),
      y: titleBaseline,
      size: 10,
      font: fontReg,
      color: BLACK,
    });
    const unitStr = formatKesTableAmount(unit);
    page.drawText(unitStr, {
      x: UNIT_COL_RIGHT - fontReg.widthOfTextAtSize(unitStr, 10),
      y: titleBaseline,
      size: 10,
      font: fontReg,
      color: BLACK,
    });
    const totStr = formatKesTableAmount(lineTotal);
    page.drawText(totStr, {
      x: AMT_COL_RIGHT - fontReg.widthOfTextAtSize(totStr, 10),
      y: titleBaseline,
      size: 10,
      font: fontReg,
      color: BLACK,
    });

    const rowBottom = yDown + Math.max(ROW_H, dy - yDown + 8);
    drawHRule(page, rowBottom - 0.24, RULE_GRAY, 0.48);
    yDown = rowBottom;
  }

  yDown += 20;
  yDown = ensureRoom(doc, pageRef, yDown, 90, fonts, false);
  page = pageRef.page;

  const totals = [
    { label: "Subtotal", value: formatKesTableAmount(subtotal), bold: false },
    { label: "Total", value: formatKesTableAmount(subtotal), bold: true },
    { label: "Amount due", value: formatKesMoney(subtotal), bold: false },
  ];
  for (const t of totals) {
    const font = t.bold ? fontBold : fontReg;
    page.drawText(t.label, { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font, color: BLACK });
    drawRight(page, t.value, AMT_COL_RIGHT, pdfYFromTop(yDown), 10, font);
    yDown += 17.4;
  }

  if (input.notes?.trim()) {
    yDown += 10;
    yDown = ensureRoom(doc, pageRef, yDown, 40, fonts, false);
    page = pageRef.page;
    page.drawText("Notes", { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font: fontBold, color: BLACK });
    yDown += 14;
    for (const ln of wrapLines(input.notes, fontReg, 10, CONTENT_RIGHT - M_LEFT)) {
      yDown = ensureRoom(doc, pageRef, yDown, 14, fonts, false);
      page = pageRef.page;
      page.drawText(ln, { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font: fontReg, color: BLACK });
      yDown += 12.5;
    }
  }

  yDown += 28.6;
  yDown = ensureRoom(doc, pageRef, yDown, 24, fonts, false);
  page = pageRef.page;
  const help = invoiceHelpLine();
  const helpLines = wrapLines(help, fontReg, 10, CONTENT_RIGHT - M_LEFT);
  for (const ln of helpLines) {
    page.drawText(ln, { x: M_LEFT, y: pdfYFromTop(yDown), size: 10, font: fontReg, color: BLACK });
    yDown += 12.5;
  }

  return doc.save();
}
