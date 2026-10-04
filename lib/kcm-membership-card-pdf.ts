import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  formatKcmIssuedDate,
  type KcmMembershipCardData,
} from "@/lib/kcm-membership-card";

const PAGE_W = 792;
const PAGE_H = 500;
const GREEN = rgb(22 / 255, 88 / 255, 65 / 255);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.92, 0.96, 0.93);

function pdfSafe(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M 0 ${rr}`,
    `A ${rr} ${rr} 0 0 1 ${rr} 0`,
    `H ${w - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w} ${rr}`,
    `V ${h - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w - rr} ${h}`,
    `H ${rr}`,
    `A ${rr} ${rr} 0 0 1 0 ${h - rr}`,
    "Z",
  ].join(" ");
}

function drawRounded(page: PDFPage, x: number, y: number, w: number, h: number, r: number, color: ReturnType<typeof rgb>) {
  page.drawSvgPath(roundedRectPath(w, h, r), { x, y, color });
}

function fitText(text: string, font: PDFFont, size: number, maxW: number): string {
  const raw = pdfSafe(text);
  if (font.widthOfTextAtSize(raw, size) <= maxW) return raw;
  let cut = raw;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxW) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

async function embedRemoteImage(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

async function embedQr(doc: PDFDocument, value: string): Promise<PDFImage | null> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=6&color=14523a&bgcolor=ffffff&data=${encodeURIComponent(value)}`;
  return embedRemoteImage(doc, url);
}

export async function generateKcmMembershipCardPdf(params: {
  card: KcmMembershipCardData;
  qrValue: string;
}): Promise<{ filename: string; bytes: Uint8Array }> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  drawRounded(page, 0, 0, PAGE_W, PAGE_H, 28, GREEN);

  page.drawText("Kenya Coast Models", {
    x: 40,
    y: PAGE_H - 58,
    size: 14,
    font: bold,
    color: MUTED,
  });

  const name = fitText(params.card.fullName, bold, 32, 520);
  page.drawText(name, {
    x: 40,
    y: PAGE_H - 102,
    size: 32,
    font: bold,
    color: WHITE,
  });

  drawRounded(page, PAGE_W - 156, PAGE_H - 156, 116, 116, 16, WHITE);
  const qr = await embedQr(doc, params.qrValue);
  if (qr) {
    page.drawImage(qr, { x: PAGE_W - 146, y: PAGE_H - 146, width: 96, height: 96 });
  }

  const fields: Array<[string, string]> = [
    ["Registration ID", params.card.membershipNumber],
    ["Category", params.card.category],
    ["Contact", params.card.contact],
    ["Email", params.card.email],
    ["Issued", formatKcmIssuedDate(params.card.issuedOn)],
  ];

  fields.forEach((field, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 40 : 400;
    const y = PAGE_H - 190 - row * 72;
    page.drawText(field[0], { x, y, size: 11, font, color: MUTED });
    page.drawText(fitText(field[1], bold, 16, 330), {
      x,
      y: y - 22,
      size: 16,
      font: bold,
      color: WHITE,
    });
  });

  drawRounded(page, 40, 28, 132, 46, 12, WHITE);
  const logo = await embedRemoteImage(doc, BRAND_LOGO_URL);
  if (logo) {
    const maxW = 108;
    const maxH = 30;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, { x: 40 + (132 - w) / 2, y: 28 + (46 - h) / 2, width: w, height: h });
  } else {
    page.drawText("Changer Fusions", { x: 54, y: 44, size: 10, font: bold, color: GREEN });
  }

  drawRounded(page, PAGE_W - 168, 32, 128, 40, 20, WHITE);
  const badge = "Approved";
  const badgeW = bold.widthOfTextAtSize(badge, 13);
  page.drawText(badge, {
    x: PAGE_W - 168 + (128 - badgeW) / 2,
    y: 46,
    size: 13,
    font: bold,
    color: GREEN,
  });

  const bytes = await doc.save();
  const safeId = params.card.membershipNumber.replace(/[^\w]+/g, "-");
  return { filename: `kcm-membership-${safeId}.pdf`, bytes };
}
