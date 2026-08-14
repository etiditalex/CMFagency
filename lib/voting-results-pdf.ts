import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import type { VotingResultsContestant, VotingResultsSnapshot } from "@/lib/voting-results-data";

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const M = 36;

const GOLD = rgb(0.83, 0.65, 0.15);
const GOLD_DEEP = rgb(0.62, 0.45, 0.08);
const GOLD_LIGHT = rgb(0.96, 0.86, 0.55);
const NAVY = rgb(0.09, 0.08, 0.05);
const IVORY = rgb(0.99, 0.97, 0.92);
const INK = rgb(0.12, 0.1, 0.06);
const MUTED = rgb(0.38, 0.32, 0.2);

const KAPPA = 0.5522847498307936;

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  const splitLong = (w: string) => {
    let chunk = "";
    for (const ch of w) {
      const trial = chunk + ch;
      if (font.widthOfTextAtSize(trial, size) <= maxW) chunk = trial;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    cur = chunk;
  };
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      if (font.widthOfTextAtSize(w, size) <= maxW) cur = w;
      else splitLong(w);
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function nairobiStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fileStamp(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "08";
    const d = parts.find((p) => p.type === "day")?.value ?? "15";
    return `${y}-${m}-${d}`;
  } catch {
    return "results";
  }
}

/** Standard PDF fonts are WinAnsi; strip combining marks so contestant names still print. */
function pdfSafe(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "W";
}

function pdfFriendlyPhotoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("cloudinary.com") && u.pathname.includes("/image/upload/")) {
      if (!/\/image\/upload\/[^/]*f_/.test(u.pathname)) {
        u.pathname = u.pathname.replace(
          "/image/upload/",
          "/image/upload/f_jpg,c_fill,g_auto,w_512,h_512,q_auto/"
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

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(pdfFriendlyPhotoUrl(url), {
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
  const bytes = await fetchImageBytes(url.trim());
  if (!bytes) return null;
  return embedRaster(doc, bytes);
}

function clipCircle(page: PDFPage, cx: number, cy: number, r: number) {
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx + r, cy),
    appendBezierCurve(cx + r, cy + r * KAPPA, cx + r * KAPPA, cy + r, cx, cy + r),
    appendBezierCurve(cx - r * KAPPA, cy + r, cx - r, cy + r * KAPPA, cx - r, cy),
    appendBezierCurve(cx - r, cy - r * KAPPA, cx - r * KAPPA, cy - r, cx, cy - r),
    appendBezierCurve(cx + r * KAPPA, cy - r, cx + r, cy - r * KAPPA, cx + r, cy),
    closePath(),
    clip(),
    endPath()
  );
}

function drawGoldRing(page: PDFPage, cx: number, cy: number, r: number, width: number) {
  page.drawCircle({
    x: cx,
    y: cy,
    size: r + width / 2,
    borderColor: GOLD,
    borderWidth: width,
  });
  page.drawCircle({
    x: cx,
    y: cy,
    size: r + width + 1.6,
    borderColor: GOLD_DEEP,
    borderWidth: 0.8,
  });
}

function drawCircledPhoto(
  page: PDFPage,
  image: PDFImage | null,
  cx: number,
  cy: number,
  diameter: number,
  name: string,
  fontBold: PDFFont
) {
  const r = diameter / 2;
  page.drawCircle({ x: cx, y: cy, size: r + 3, color: GOLD_LIGHT });
  if (image) {
    const iw = image.width;
    const ih = image.height;
    const scale = Math.max(diameter / iw, diameter / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    clipCircle(page, cx, cy, r);
    page.drawImage(image, { x: cx - dw / 2, y: cy - dh / 2, width: dw, height: dh });
    page.pushOperators(popGraphicsState());
  } else {
    page.drawCircle({ x: cx, y: cy, size: r, color: GOLD_DEEP });
    const ini = initialsOf(pdfSafe(name));
    const size = diameter * 0.32;
    const w = fontBold.widthOfTextAtSize(ini, size);
    page.drawText(ini, {
      x: cx - w / 2,
      y: cy - size / 3,
      size,
      font: fontBold,
      color: IVORY,
    });
  }
  drawGoldRing(page, cx, cy, r, 3.2);
}

function drawCentered(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color });
}

async function embedLogo(doc: PDFDocument): Promise<{ image: PDFImage; w: number; h: number } | null> {
  const image = await embedUrl(doc, BRAND_LOGO_URL);
  if (!image) return null;
  const maxW = 118;
  const scale = maxW / image.width;
  return { image, w: maxW, h: image.height * scale };
}

/**
 * Gold official winners booklet: one card per category winner with a circled photo when available.
 */
export async function buildWinnersPdf(
  snapshot: VotingResultsSnapshot
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const logo = await embedLogo(doc);

  const unique = new Map<string, string | null>();
  for (const cat of snapshot.categories) {
    for (const w of cat.winners) unique.set(w.id, w.image_url);
  }
  const ids = [...unique.keys()];
  const bytesById = new Map<string, Uint8Array | null>();
  const CONCURRENCY = 6;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const slice = ids.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      slice.map((id) => {
        const url = unique.get(id);
        return url ? fetchImageBytes(url) : Promise.resolve(null);
      })
    );
    slice.forEach((id, idx) => bytesById.set(id, fetched[idx]));
  }
  const winnerPhotos = new Map<string, PDFImage | null>();
  for (const id of ids) {
    const bytes = bytesById.get(id);
    winnerPhotos.set(id, bytes ? await embedRaster(doc, bytes) : null);
  }

  const stamp = nairobiStamp(snapshot.generatedAtIso);
  const cards: Array<{ categoryTitle: string; winner: VotingResultsContestant; joint: boolean; undeclared: boolean }> =
    [];
  for (const cat of snapshot.categories) {
    if (cat.winners.length === 0) {
      cards.push({
        categoryTitle: cat.title,
        winner: { id: cat.id, name: "No votes recorded", image_url: null, votes: 0, rank: 0 },
        joint: false,
        undeclared: true,
      });
      continue;
    }
    const joint = cat.winners.length > 1;
    for (const winner of cat.winners) {
      cards.push({ categoryTitle: cat.title, winner, joint, undeclared: false });
    }
  }

  const CARD_H = 248;
  const gap = 16;
  const headerH = 118;

  const addPage = () => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: NAVY });
    page.drawRectangle({ x: 14, y: 14, width: PAGE_W - 28, height: PAGE_H - 28, borderColor: GOLD, borderWidth: 1.6 });
    page.drawRectangle({ x: 20, y: 20, width: PAGE_W - 40, height: PAGE_H - 40, borderColor: GOLD_LIGHT, borderWidth: 0.6 });
    page.drawRectangle({ x: 20, y: PAGE_H - headerH, width: PAGE_W - 40, height: headerH - 20, color: GOLD_DEEP });
    page.drawRectangle({ x: 20, y: PAGE_H - 26, width: PAGE_W - 40, height: 6, color: GOLD });
    if (logo) {
      page.drawImage(logo.image, {
        x: (PAGE_W - logo.w) / 2,
        y: PAGE_H - 28 - logo.h,
        width: logo.w,
        height: logo.h,
      });
    }
    const titleY = logo ? PAGE_H - 36 - logo.h - 16 : PAGE_H - 52;
    drawCentered(page, "COAST FASHION AWARDS 2026", titleY, 16, bold, IVORY);
    drawCentered(page, "Official Category Winners", titleY - 18, 11, italic, GOLD_LIGHT);
    page.drawText(`Prepared ${stamp} EAT`, {
      x: M,
      y: 28,
      size: 8,
      font: italic,
      color: GOLD_LIGHT,
    });
    return page;
  };

  let page = addPage();
  let y = PAGE_H - headerH - 18;
  let pageIndex = 1;

  const paintFooter = (p: PDFPage, idx: number) => {
    const label = `Page ${idx}`;
    p.drawText(label, {
      x: PAGE_W - M - bold.widthOfTextAtSize(label, 8),
      y: 28,
      size: 8,
      font,
      color: GOLD_LIGHT,
    });
    p.drawText("CMF Agency  ·  Confidential results", {
      x: M + 150,
      y: 28,
      size: 8,
      font,
      color: GOLD,
    });
  };

  for (const card of cards) {
    if (y - CARD_H < 48) {
      paintFooter(page, pageIndex);
      page = addPage();
      pageIndex += 1;
      y = PAGE_H - headerH - 18;
    }

    const cardY = y - CARD_H;
    page.drawRectangle({
      x: M,
      y: cardY,
      width: PAGE_W - 2 * M,
      height: CARD_H,
      color: IVORY,
      borderColor: GOLD,
      borderWidth: 2,
    });
    page.drawRectangle({
      x: M + 8,
      y: cardY + 8,
      width: PAGE_W - 2 * M - 16,
      height: CARD_H - 16,
      borderColor: GOLD_LIGHT,
      borderWidth: 0.7,
    });

    const photoD = 128;
    const cx = M + 28 + photoD / 2;
    const cy = cardY + CARD_H / 2;
    drawCircledPhoto(
      page,
      card.undeclared ? null : winnerPhotos.get(card.winner.id) ?? null,
      cx,
      cy,
      photoD,
      card.winner.name,
      bold
    );

    const textX = M + 28 + photoD + 28;
    const textW = PAGE_W - textX - M - 20;
    let ty = cardY + CARD_H - 48;

    page.drawText(card.undeclared ? "CATEGORY" : card.joint ? "JOINT WINNERS" : "CATEGORY WINNER", {
      x: textX,
      y: ty,
      size: 9,
      font: bold,
      color: GOLD_DEEP,
    });
    ty -= 22;
    const catLines = wrapLines(pdfSafe(card.categoryTitle), bold, 13, textW);
    for (const line of catLines.slice(0, 3)) {
      page.drawText(line, { x: textX, y: ty, size: 13, font: bold, color: INK });
      ty -= 16;
    }
    ty -= 10;
    const nameLines = wrapLines(pdfSafe(card.winner.name), bold, 18, textW);
    for (const line of nameLines.slice(0, 3)) {
      page.drawText(line, { x: textX, y: ty, size: 18, font: bold, color: GOLD_DEEP });
      ty -= 22;
    }
    if (!card.undeclared) {
      const votesLabel = `${card.winner.votes.toLocaleString("en-KE")} vote${card.winner.votes === 1 ? "" : "s"}`;
      page.drawText(votesLabel, { x: textX, y: ty - 4, size: 12, font, color: MUTED });
    } else {
      page.drawText("Winner not declared — no paid votes in this category.", {
        x: textX,
        y: ty - 4,
        size: 10,
        font: italic,
        color: MUTED,
      });
    }

    y = cardY - gap;
  }

  paintFooter(page, pageIndex);
  const bytes = await doc.save();
  return {
    bytes,
    filename: `CFMA-2026-category-winners-${fileStamp(snapshot.generatedAtIso)}.pdf`,
  };
}

/**
 * Full contestant roll: every participant grouped by category, ranked by votes.
 * Category winners are highlighted in gold.
 */
export async function buildContestantsPdf(
  snapshot: VotingResultsSnapshot
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(doc);
  const stamp = nairobiStamp(snapshot.generatedAtIso);

  const ROW_H = 16;
  const headerBand = 92;

  const addPage = (first: boolean) => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: PAGE_H - headerBand, width: PAGE_W, height: headerBand, color: NAVY });
    page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });
    page.drawRectangle({ x: 0, y: PAGE_H - headerBand, width: PAGE_W, height: 3, color: GOLD });
    if (logo) {
      page.drawImage(logo.image, { x: M, y: PAGE_H - 28 - Math.min(logo.h, 36), width: logo.w * 0.72, height: logo.h * 0.72 });
    }
    page.drawText("COAST FASHION AWARDS 2026", {
      x: logo ? M + logo.w * 0.72 + 14 : M,
      y: PAGE_H - 36,
      size: 13,
      font: bold,
      color: GOLD,
    });
    page.drawText(first ? "All contestants who participated in voting" : "All contestants (continued)", {
      x: logo ? M + logo.w * 0.72 + 14 : M,
      y: PAGE_H - 54,
      size: 10,
      font,
      color: GOLD_LIGHT,
    });
    page.drawText(`${snapshot.contestantCount} contestants  ·  ${snapshot.categoryCount} categories  ·  ${snapshot.totalVotes.toLocaleString("en-KE")} votes`, {
      x: logo ? M + logo.w * 0.72 + 14 : M,
      y: PAGE_H - 70,
      size: 8,
      font,
      color: rgb(0.85, 0.8, 0.65),
    });
    page.drawText(`Prepared ${stamp} EAT`, {
      x: M,
      y: 22,
      size: 8,
      font,
      color: MUTED,
    });
    return page;
  };

  let page = addPage(true);
  let y = PAGE_H - headerBand - 18;
  let pageIndex = 1;

  const cols = { rank: M, name: M + 36, votes: PAGE_W - M - 70 };
  const innerW = PAGE_W - 2 * M;

  const newPageIfNeeded = (need: number) => {
    if (y - need < 40) {
      const label = `Page ${pageIndex}`;
      page.drawText(label, {
        x: PAGE_W - M - font.widthOfTextAtSize(label, 8),
        y: 22,
        size: 8,
        font,
        color: MUTED,
      });
      page = addPage(false);
      pageIndex += 1;
      y = PAGE_H - headerBand - 18;
    }
  };

  for (const cat of snapshot.categories) {
    newPageIfNeeded(36 + Math.min(cat.contestants.length, 3) * ROW_H);
    page.drawRectangle({ x: M, y: y - 4, width: innerW, height: 18, color: GOLD_DEEP });
    page.drawText(pdfSafe(cat.title).slice(0, 70), {
      x: M + 8,
      y: y,
      size: 9,
      font: bold,
      color: IVORY,
    });
    const tally = `${cat.totalVotes.toLocaleString("en-KE")} votes`;
    page.drawText(tally, {
      x: PAGE_W - M - 8 - font.widthOfTextAtSize(tally, 8),
      y: y,
      size: 8,
      font,
      color: GOLD_LIGHT,
    });
    y -= 22;

    page.drawText("#", { x: cols.rank, y, size: 8, font: bold, color: GOLD_DEEP });
    page.drawText("Contestant", { x: cols.name, y, size: 8, font: bold, color: GOLD_DEEP });
    page.drawText("Votes", { x: cols.votes, y, size: 8, font: bold, color: GOLD_DEEP });
    y -= 12;
    page.drawLine({
      start: { x: M, y: y + 6 },
      end: { x: PAGE_W - M, y: y + 6 },
      thickness: 0.6,
      color: GOLD,
    });

    if (cat.contestants.length === 0) {
      page.drawText("No contestants in this category.", { x: cols.name, y, size: 9, font, color: MUTED });
      y -= 20;
      continue;
    }

    for (const c of cat.contestants) {
      newPageIfNeeded(ROW_H + 2);
      const isWinner = c.rank === 1 && c.votes > 0;
      if (isWinner) {
        page.drawRectangle({
          x: M,
          y: y - 3,
          width: innerW,
          height: ROW_H,
          color: GOLD_LIGHT,
        });
      }
      const rankLabel = String(c.rank);
      page.drawText(rankLabel, { x: cols.rank, y, size: 9, font: isWinner ? bold : font, color: INK });
      const safeName = pdfSafe(c.name);
      const name = safeName.length > 52 ? `${safeName.slice(0, 51)}...` : safeName;
      page.drawText(isWinner ? `${name}  ·  WINNER` : name, {
        x: cols.name,
        y,
        size: 9,
        font: isWinner ? bold : font,
        color: isWinner ? GOLD_DEEP : INK,
      });
      const votes = c.votes.toLocaleString("en-KE");
      page.drawText(votes, {
        x: cols.votes + 40 - font.widthOfTextAtSize(votes, 9),
        y,
        size: 9,
        font: isWinner ? bold : font,
        color: INK,
      });
      y -= ROW_H;
    }
    y -= 10;
  }

  const label = `Page ${pageIndex}`;
  page.drawText(label, {
    x: PAGE_W - M - font.widthOfTextAtSize(label, 8),
    y: 22,
    size: 8,
    font,
    color: MUTED,
  });

  const bytes = await doc.save();
  return {
    bytes,
    filename: `CFMA-2026-all-contestants-${fileStamp(snapshot.generatedAtIso)}.pdf`,
  };
}

export async function buildVotingResultsPdfs(snapshot: VotingResultsSnapshot): Promise<{
  winners: { bytes: Uint8Array; filename: string };
  contestants: { bytes: Uint8Array; filename: string };
}> {
  const [winners, contestants] = await Promise.all([buildWinnersPdf(snapshot), buildContestantsPdf(snapshot)]);
  return { winners, contestants };
}
