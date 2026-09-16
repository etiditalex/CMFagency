import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import type { EventTicketPdfInput } from "@/lib/event-ticket";
import { EVENT_TICKET_TERMS } from "@/lib/event-ticket-terms";

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const M = 40;
const BODY_W = PAGE_W - 2 * M;

const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.38, 0.38, 0.38);
const RULE = rgb(0.9, 0.9, 0.9);
const GOLD = rgb(0.831, 0.686, 0.216);
const NAVY = rgb(0.09, 0.1, 0.16);

function pdfSafe(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
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
  return lines.length ? lines : [""];
}

function posterPdfUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("cloudinary.com") && u.pathname.includes("/image/upload/")) {
      if (!/\/image\/upload\/[^/]*f_/.test(u.pathname)) {
        u.pathname = u.pathname.replace(
          "/image/upload/",
          "/image/upload/f_jpg,c_fill,g_auto,w_1400,h_900,q_auto/"
        );
      }
      return u.href;
    }
  } catch {
    /* keep original */
  }
  return url;
}

async function embedRaster(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  const b0 = bytes[0];
  const b1 = bytes[1];
  try {
    if (b0 === 0xff && b1 === 0xd8) return await doc.embedJpg(bytes);
    if (b0 === 0x89 && b1 === 0x50) return await doc.embedPng(bytes);
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return await doc.embedPng(bytes);
    }
  } catch {
    return null;
  }
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "image/jpeg,image/png,image/*" },
    });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedUrl(doc: PDFDocument, url: string | null | undefined): Promise<PDFImage | null> {
  if (!url?.trim()) return null;
  const raw = url.trim();
  const dataMatch = raw.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/i);
  const bytes = dataMatch
    ? Uint8Array.from(Buffer.from(dataMatch[1], "base64"))
    : await fetchBytes(posterPdfUrl(raw));
  if (!bytes) return null;
  return embedRaster(doc, bytes);
}

function drawCover(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  const imgAspect = image.width / image.height;
  const boxAspect = w / h;
  let dw: number;
  let dh: number;
  if (imgAspect > boxAspect) {
    dh = h;
    dw = h * imgAspect;
  } else {
    dw = w;
    dh = w / imgAspect;
  }
  const dx = x - (dw - w) / 2;
  const dy = y - (dh - h) / 2;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(x, y),
    lineTo(x + w, y),
    lineTo(x + w, y + h),
    lineTo(x, y + h),
    closePath(),
    clip(),
    endPath()
  );
  page.drawImage(image, { x: dx, y: dy, width: dw, height: dh });
  page.pushOperators(popGraphicsState());
}

function drawField(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number
): number {
  page.drawText(label, { x, y, size: 9, font, color: MUTED });
  const lines = wrapLines(value, bold, 12, maxW);
  let cy = y - 15;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size: 12, font: bold, color: INK });
    cy -= 14;
  }
  return cy - 10;
}

export async function buildEventTicketPdf(input: EventTicketPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(input.qrData)}`;
  const [poster, qr] = await Promise.all([
    embedUrl(doc, input.posterUrl),
    embedUrl(doc, qrUrl),
  ]);

  const page1 = doc.addPage([PAGE_W, PAGE_H]);
  const posterH = 360;
  const posterY = PAGE_H - M - posterH;
  page1.drawRectangle({ x: M, y: posterY, width: BODY_W, height: posterH, color: NAVY });
  if (poster) {
    drawCover(page1, poster, M, posterY, BODY_W, posterH);
  } else {
    const title = wrapLines(input.eventTitle, bold, 22, BODY_W - 48);
    let ty = posterY + posterH / 2 + title.length * 12;
    for (const line of title) {
      const tw = bold.widthOfTextAtSize(line, 22);
      page1.drawText(line, {
        x: M + (BODY_W - tw) / 2,
        y: ty,
        size: 22,
        font: bold,
        color: rgb(1, 1, 1),
      });
      ty -= 28;
    }
  }

  page1.drawRectangle({ x: M, y: posterY - 4, width: BODY_W, height: 4, color: GOLD });

  let y = posterY - 28;
  for (const line of wrapLines(input.eventTitle, bold, 18, BODY_W)) {
    page1.drawText(line, { x: M, y, size: 18, font: bold, color: INK });
    y -= 22;
  }

  y -= 4;
  page1.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 1,
    color: RULE,
  });
  y -= 26;

  const qrSize = 108;
  const detailsW = BODY_W - qrSize - 24;
  const fields: Array<[string, string]> = [
    ["Name", input.holderName],
    ["Allows", String(input.allows)],
    ["Ticket Type", input.ticketTypeLabel],
    ["Day", input.ticketDay || "To be confirmed"],
    ["Ticket ID", input.ticketId],
    ["Venue", input.venue],
  ];

  const fieldsTop = y;
  let fy = y;
  for (const [label, value] of fields) {
    fy = drawField(page1, font, bold, label, value, M, fy, detailsW);
  }

  if (qr) {
    const qrY = fieldsTop - qrSize + 4;
    page1.drawImage(qr, { x: PAGE_W - M - qrSize, y: qrY, width: qrSize, height: qrSize });
    const scan = "Show at entry";
    const sw = font.widthOfTextAtSize(scan, 8);
    page1.drawText(scan, {
      x: PAGE_W - M - qrSize + (qrSize - sw) / 2,
      y: qrY - 12,
      size: 8,
      font,
      color: MUTED,
    });
  }

  page1.drawText(pdfSafe(input.organizerName), {
    x: M,
    y: M,
    size: 9,
    font: bold,
    color: INK,
  });

  const page2 = doc.addPage([PAGE_W, PAGE_H]);
  if (poster) {
    drawCover(page2, poster, M, PAGE_H - M - 120, BODY_W, 120);
    page2.drawRectangle({ x: M, y: PAGE_H - M - 124, width: BODY_W, height: 4, color: GOLD });
    y = PAGE_H - M - 150;
  } else {
    y = PAGE_H - M - 24;
  }

  page2.drawText(pdfSafe(input.eventTitle), { x: M, y, size: 14, font: bold, color: INK });
  y -= 28;
  page2.drawText("Terms and Conditions", { x: M, y, size: 16, font: bold, color: INK });
  y -= 22;

  EVENT_TICKET_TERMS.forEach((term, i) => {
    const prefix = `${i + 1}. `;
    const prefixW = font.widthOfTextAtSize(prefix, 11);
    const lines = wrapLines(term, font, 11, BODY_W - prefixW);
    page2.drawText(prefix, { x: M, y, size: 11, font: bold, color: INK });
    for (const line of lines) {
      page2.drawText(line, { x: M + prefixW, y, size: 11, font, color: INK });
      y -= 15;
    }
    y -= 12;
  });

  page2.drawText(pdfSafe(input.organizerName), {
    x: M,
    y: M,
    size: 9,
    font: bold,
    color: INK,
  });

  return doc.save();
}
