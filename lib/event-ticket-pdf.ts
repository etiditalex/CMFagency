import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

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

/** Fetch the full poster — never c_fill crop. */
function posterPdfUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com")) return url;
    const marker = "/image/upload/";
    const i = u.pathname.indexOf(marker);
    if (i < 0) return url;
    const rest = u.pathname.slice(i + marker.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length === 0) return url;
    const looksLikeTransform =
      !/^v\d+$/i.test(parts[0]) && !/\.(jpe?g|png|webp|gif|avif)$/i.test(parts[0]);
    const remainder = (looksLikeTransform ? parts.slice(1) : parts).join("/");
    if (!remainder) return url;
    u.pathname = `${u.pathname.slice(0, i + marker.length)}f_jpg,q_auto:good,c_limit,w_2000/${remainder}`;
    return u.href;
  } catch {
    return url;
  }
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

/** Fit the whole image inside the box — never crop. */
function drawContain(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  const imgAspect = image.width / Math.max(1, image.height);
  const boxAspect = w / h;
  let dw: number;
  let dh: number;
  if (imgAspect > boxAspect) {
    dw = w;
    dh = w / imgAspect;
  } else {
    dh = h;
    dw = h * imgAspect;
  }
  page.drawImage(image, {
    x: x + (w - dw) / 2,
    y: y + (h - dh) / 2,
    width: dw,
    height: dh,
  });
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

function drawFallbackPosterPage(
  page: PDFPage,
  input: EventTicketPdfInput,
  font: PDFFont,
  bold: PDFFont
) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });
  const title = wrapLines(input.eventTitle, bold, 28, BODY_W);
  let ty = PAGE_H / 2 + title.length * 16;
  for (const line of title) {
    const tw = bold.widthOfTextAtSize(line, 28);
    page.drawText(line, {
      x: (PAGE_W - tw) / 2,
      y: ty,
      size: 28,
      font: bold,
      color: rgb(1, 1, 1),
    });
    ty -= 34;
  }
  const host = pdfSafe(input.organizerName);
  const hw = font.widthOfTextAtSize(host, 12);
  page.drawText(host, {
    x: (PAGE_W - hw) / 2,
    y: M + 24,
    size: 12,
    font,
    color: GOLD,
  });
}

export async function buildEventTicketPdf(input: EventTicketPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(input.qrData)}`;
  const [poster, qr] = await Promise.all([embedUrl(doc, input.posterUrl), embedUrl(doc, qrUrl)]);

  const page1 = doc.addPage([PAGE_W, PAGE_H]);
  if (poster) {
    page1.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(1, 1, 1) });
    drawContain(page1, poster, 0, 0, PAGE_W, PAGE_H);
  } else {
    drawFallbackPosterPage(page1, input, font, bold);
  }

  const page2 = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  for (const line of wrapLines(input.eventTitle, bold, 16, BODY_W)) {
    page2.drawText(line, { x: M, y, size: 16, font: bold, color: INK });
    y -= 20;
  }
  y -= 8;

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
    fy = drawField(page2, font, bold, label, value, M, fy, detailsW);
  }

  if (qr) {
    const qrY = Math.max(fy + 8, fieldsTop - qrSize);
    page2.drawImage(qr, { x: PAGE_W - M - qrSize, y: qrY, width: qrSize, height: qrSize });
    const scan = "Show at entry";
    const sw = font.widthOfTextAtSize(scan, 8);
    page2.drawText(scan, {
      x: PAGE_W - M - qrSize + (qrSize - sw) / 2,
      y: qrY - 12,
      size: 8,
      font,
      color: MUTED,
    });
  }

  y = Math.min(fy, fieldsTop - qrSize - 20) - 8;
  page2.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 1,
    color: RULE,
  });
  page2.drawRectangle({ x: M, y: y - 4, width: 72, height: 4, color: GOLD });
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
