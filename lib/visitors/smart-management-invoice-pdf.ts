import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { INVOICE_MPESA_ACCOUNT, INVOICE_MPESA_PAYBILL } from "@/lib/invoice-payment-details";
import {
  getSmartManagementInvoiceFeatures,
  smartManagementPackageLabel,
} from "@/lib/visitors/smart-management-invoice-features";
import type { PaidVisitorPlan } from "@/lib/visitors/subscription-pricing";

export type BuildSmartManagementInvoicePdfInput = {
  billToName: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  plan: PaidVisitorPlan;
  /** Lifetime package total in KSh (only amount shown on the PDF). */
  totalAmountKes: number;
  notes?: string;
  dueDateIso?: string | null;
  invoiceRef: string;
  /** Default: Cash */
  paymentMethod?: "cash" | "mpesa" | "cash_or_mpesa";
};

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const M = 50;
const BODY_W = PAGE_W - 2 * M;
const BRAND_GRAY = rgb(0.42, 0.43, 0.45);
const BRAND_DARK = rgb(0.12, 0.12, 0.14);
const ACCENT = rgb(0.08, 0.45, 0.35);
const DOC_TITLE = "Smart Management Invoice";

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

export function buildSmartManagementInvoicePdfFilename(billToName: string, d = new Date()): string {
  const label = billToName.trim() || "CLIENT";
  const { ymd, hms } = nairobiYmdHms(d);
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `SMART MANAGEMENT INVOICE FOR ${label} _${ymd}_${hms}_${seq}.pdf`;
}

function addCompanyFooter(page: PDFPage, fontReg: PDFFont) {
  const t = "Thank you for your business · Changer Fusions · Fusion Xpress";
  const w = fontReg.widthOfTextAtSize(t, 8);
  page.drawText(t, { x: (PAGE_W - w) / 2, y: 22, size: 8, font: fontReg, color: BRAND_GRAY });
}

const MIN_Y_BEFORE_PAYMENT_BLOCK = 148;

function drawPaymentAndSignature(
  page: PDFPage,
  fontReg: PDFFont,
  fontBold: PDFFont,
  invoiceRef: string,
  paymentMethod: BuildSmartManagementInvoicePdfInput["paymentMethod"],
  topY: number
): void {
  let y = topY;
  y -= 6;

  const method = paymentMethod ?? "cash";
  if (method === "cash") {
    page.drawText("Payment — Cash", { x: M, y, size: 10, font: fontBold, color: BRAND_DARK });
    y -= 13;
    page.drawText("Pay in cash to Changer Fusions against this invoice reference.", {
      x: M,
      y,
      size: 9,
      font: fontReg,
      color: BRAND_DARK,
    });
    y -= 12;
  } else if (method === "mpesa") {
    page.drawText("Payment — M-Pesa Paybill", { x: M, y, size: 10, font: fontBold, color: BRAND_DARK });
    y -= 13;
    page.drawText(`Paybill No: ${INVOICE_MPESA_PAYBILL}`, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
    page.drawText(`Account No: ${INVOICE_MPESA_ACCOUNT}`, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
  } else {
    page.drawText("Payment — Cash or M-Pesa Paybill", { x: M, y, size: 10, font: fontBold, color: BRAND_DARK });
    y -= 13;
    page.drawText("Cash: pay to Changer Fusions against this invoice reference.", {
      x: M,
      y,
      size: 9,
      font: fontReg,
      color: BRAND_DARK,
    });
    y -= 12;
    page.drawText(`M-Pesa Paybill: ${INVOICE_MPESA_PAYBILL} · Account: ${INVOICE_MPESA_ACCOUNT}`, {
      x: M,
      y,
      size: 9,
      font: fontReg,
      color: BRAND_DARK,
    });
    y -= 12;
  }

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

function ensureSpace(
  doc: PDFDocument,
  page: PDFPage,
  y: number,
  needed: number,
  fontReg: PDFFont,
  H: number
): { page: PDFPage; y: number } {
  if (y - needed >= M + 40) return { page, y };
  addCompanyFooter(page, fontReg);
  const next = doc.addPage([PAGE_W, PAGE_H]);
  return { page: next, y: H - M };
}

/**
 * Smart Management Invoice PDF for Fusion Xpress visitor packages (lifetime).
 * Lists package features without per-line amounts — only a single total.
 */
export async function buildSmartManagementInvoicePdfBytes(
  input: BuildSmartManagementInvoicePdfInput
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

  const companyBlock = ["Changer Fusions", "Fusion Xpress · Smart Visitor Management", "Mombasa, Kenya"];
  let ry = H - M - 10;
  for (const ln of companyBlock) {
    const lw = fontReg.widthOfTextAtSize(ln, 9);
    page.drawText(ln, { x: PAGE_W - M - lw, y: ry, size: 9, font: fontReg, color: BRAND_GRAY });
    ry -= 11;
  }

  page.drawText(DOC_TITLE.toUpperCase(), { x: M, y: y - 8, size: 18, font: fontBold, color: BRAND_DARK });
  y -= 34;

  page.drawText(`Invoice number  ${input.invoiceRef}`, { x: M, y, size: 10, font: fontReg, color: BRAND_GRAY });
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

  const packageName = smartManagementPackageLabel(input.plan);
  const totalKes = Math.max(0, Math.round(Number(input.totalAmountKes) || 0));
  const totalStr = `KSh ${totalKes.toLocaleString("en-KE")}`;

  const bx = M + 12;
  let by = boxTop - 20;
  page.drawText(DOC_TITLE, { x: bx, y: by, size: 12, font: fontBold, color: BRAND_DARK });
  by -= 16;
  page.drawText(`Invoice date: ${invDate}`, { x: bx, y: by, size: 10, font: fontReg, color: BRAND_DARK });
  page.drawText(`Due date: ${due}`, { x: bx + 240, y: by, size: 10, font: fontReg, color: BRAND_DARK });
  by -= 16;
  page.drawText(`Package: ${packageName} · Lifetime`, { x: bx, y: by, size: 10, font: fontReg, color: BRAND_DARK });

  y = boxTop - boxH - 28;

  page.drawText("BILL TO", { x: M, y, size: 8, font: fontBold, color: ACCENT });
  y -= 16;
  const billName = input.billToName.trim() || "Client";
  page.drawText(billName, { x: M, y, size: 11, font: fontBold, color: BRAND_DARK });
  y -= 14;
  if (input.billToAddress?.trim()) {
    for (const line of wrapLines(input.billToAddress, fontReg, 9, BODY_W - 20)) {
      page.drawText(line, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
      y -= 11;
    }
  }
  if (input.billToEmail?.trim()) {
    page.drawText(input.billToEmail.trim(), { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
  }
  if (input.billToPhone?.trim()) {
    page.drawText(input.billToPhone.trim(), { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
    y -= 12;
  }
  y -= 18;

  // Package header row (description only — no qty / rate / amount columns)
  const headerH = 22;
  ({ page, y } = ensureSpace(doc, page, y, headerH + 40, fontReg, H));
  page.drawRectangle({
    x: M,
    y: y - headerH,
    width: BODY_W,
    height: headerH,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.85, 0.86, 0.88),
    borderWidth: 0.5,
  });
  page.drawText("Description", {
    x: M + 8,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: BRAND_DARK,
  });
  y -= headerH;

  const packageTitle = `Fusion Xpress Smart Visitor Management — ${packageName} (Lifetime)`;
  const packageLines = wrapLines(packageTitle, fontBold, 10, BODY_W - 24);
  const packageRowH = Math.max(28, 10 + packageLines.length * 12 + 8);
  ({ page, y } = ensureSpace(doc, page, y, packageRowH + 20, fontReg, H));
  page.drawRectangle({
    x: M,
    y: y - packageRowH,
    width: BODY_W,
    height: packageRowH,
    borderColor: rgb(0.9, 0.91, 0.92),
    borderWidth: 0.5,
  });
  let dy = y - 14;
  for (const ln of packageLines) {
    page.drawText(ln, { x: M + 8, y: dy, size: 10, font: fontBold, color: BRAND_DARK });
    dy -= 12;
  }
  y -= packageRowH;

  // Features — no amounts on each line
  page.drawText("Included features", {
    x: M + 8,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: ACCENT,
  });
  y -= 28;

  const features = getSmartManagementInvoiceFeatures(input.plan);
  for (const feature of features) {
    const featLines = wrapLines(`•  ${feature}`, fontReg, 9, BODY_W - 20);
    const featH = featLines.length * 12 + 4;
    ({ page, y } = ensureSpace(doc, page, y, featH + 8, fontReg, H));
    let fy = y;
    for (const ln of featLines) {
      page.drawText(ln, { x: M + 8, y: fy, size: 9, font: fontReg, color: BRAND_DARK });
      fy -= 12;
    }
    y -= featH;
  }

  y -= 16;

  // Total only (single amount on the document)
  const summaryH = 56;
  ({ page, y } = ensureSpace(doc, page, y, summaryH + MIN_Y_BEFORE_PAYMENT_BLOCK, fontReg, H));
  page.drawRectangle({
    x: M,
    y: y - summaryH,
    width: BODY_W,
    height: summaryH,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.85, 0.86, 0.88),
    borderWidth: 0.5,
  });
  const totalLabel = "Total (KSh)";
  const totalLabelW = fontBold.widthOfTextAtSize(totalLabel, 9);
  page.drawText(totalLabel, {
    x: PAGE_W - M - totalLabelW - 12,
    y: y - 20,
    size: 9,
    font: fontBold,
    color: BRAND_GRAY,
  });
  const amtW = fontBold.widthOfTextAtSize(totalStr, 16);
  page.drawText(totalStr, {
    x: PAGE_W - M - amtW - 12,
    y: y - 42,
    size: 16,
    font: fontBold,
    color: BRAND_DARK,
  });
  y -= summaryH + 18;

  if (input.notes?.trim()) {
    ({ page, y } = ensureSpace(doc, page, y, 40, fontReg, H));
    page.drawText("Notes", { x: M, y, size: 9, font: fontBold, color: ACCENT });
    y -= 12;
    for (const ln of wrapLines(input.notes, fontReg, 9, BODY_W)) {
      ({ page, y } = ensureSpace(doc, page, y, 14, fontReg, H));
      page.drawText(ln, { x: M, y, size: 9, font: fontReg, color: BRAND_DARK });
      y -= 11;
    }
    y -= 8;
  }

  const addrLines = [
    "Changer Fusions",
    "Ambalal Building, Nkruma Road",
    "Ambalal, Mombasa, Kenya",
    `Reference on payment: ${input.invoiceRef}`,
  ];
  for (const ln of addrLines) {
    ({ page, y } = ensureSpace(doc, page, y, 14, fontReg, H));
    page.drawText(ln, { x: M, y, size: 8, font: fontReg, color: BRAND_GRAY });
    y -= 10;
  }

  if (y < MIN_Y_BEFORE_PAYMENT_BLOCK) {
    addCompanyFooter(page, fontReg);
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = H - M - 8;
    page.drawText(`Changer Fusions · ${input.invoiceRef}`, { x: M, y, size: 9, font: fontReg, color: BRAND_GRAY });
    y -= 20;
  }

  drawPaymentAndSignature(page, fontReg, fontBold, input.invoiceRef, input.paymentMethod ?? "cash", y);
  addCompanyFooter(page, fontReg);

  return doc.save();
}
