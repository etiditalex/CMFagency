import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import path from "path";
import fs from "fs";

export type CertificateData = {
  participantName: string;
  categoryTitle: string;
  /** Legacy templates only; ignored on CFMA 2026 artwork PDF. */
  date?: string;
};

const CERT_2026_FILENAME = "CoastFashionAwards2026ParticipationCertificate.pdf";
const LEGACY_TEMPLATE = "CertificateOfParticipation.pdf";

const E_SIGN_LABEL = "Digitally signed by CMF Agency";

const NAME_BAND_MARGIN_X = 72;

function nameBandBounds(height: number) {
  const top = height * 0.64;
  const bottom = height * 0.46;
  return { top, bottom, height: top - bottom };
}

function fitNameFontSize(
  name: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  maxWidth: number,
  preferred: number,
  minSize: number
): number {
  let size = preferred;
  while (size > minSize && font.widthOfTextAtSize(name, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function resolveTemplatePath(): { filePath: string; minimalOverlay: boolean } {
  const dir = path.join(process.cwd(), "public", "certificates");
  const primary = path.join(dir, CERT_2026_FILENAME);
  if (fs.existsSync(primary)) {
    return { filePath: primary, minimalOverlay: true };
  }
  return {
    filePath: path.join(dir, LEGACY_TEMPLATE),
    minimalOverlay: false,
  };
}

function fitCategoryFontSize(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  maxWidth: number,
  preferred: number,
  minSize: number
): number {
  let size = preferred;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/**
 * CFMA 2026 official artwork: do not paint over borders/background — only add name + category text.
 * Coordinates are tuned for 842.25 × 595.5 pt (landscape); scale with page height if needed.
 */
function drawMinimalOverlay(
  page: PDFPage,
  width: number,
  height: number,
  participantName: string,
  categoryTitle: string,
  fontName: PDFFont,
  fontBody: PDFFont
) {
  const nameColor = rgb(0.1, 0.32, 0.22);
  const bodyTextColor = rgb(0.12, 0.12, 0.14);
  const marginX = width * 0.08;
  const maxTextW = width - 2 * marginX;

  const nameStr = participantName.trim() || "Participant";
  const fontSizeName = fitNameFontSize(nameStr, fontName, maxTextW, 26, 14);
  const nameW = fontName.widthOfTextAtSize(nameStr, fontSizeName);
  const nameY = height * 0.53;
  page.drawText(nameStr, {
    x: width / 2 - nameW / 2,
    y: nameY,
    size: fontSizeName,
    font: fontName,
    color: nameColor,
  });

  const catStr = categoryTitle.trim() || "Category";
  const fontSizeCat = fitCategoryFontSize(catStr, fontBody, maxTextW, 13, 9);
  const catW = fontBody.widthOfTextAtSize(catStr, fontSizeCat);
  const categoryY = height * 0.395;
  page.drawText(catStr, {
    x: width / 2 - catW / 2,
    y: categoryY,
    size: fontSizeCat,
    font: fontBody,
    color: bodyTextColor,
  });
}

/**
 * Legacy template: white band over sample name, then name, category, date, e-sign.
 */
function drawLegacyOverlay(
  page: PDFPage,
  width: number,
  height: number,
  data: CertificateData,
  font: PDFFont,
  fontName: PDFFont
) {
  const fontSizeCategory = 14;
  const fontSizeDate = 11;
  const fontSizeSign = 10;
  const bodyTextColor = rgb(0.1, 0.1, 0.2);
  const nameColor = rgb(0.12, 0.42, 0.28);

  const { bottom: nameBandBottom, height: nameBandH } = nameBandBounds(height);
  const coverW = width - 2 * NAME_BAND_MARGIN_X;
  page.drawRectangle({
    x: NAME_BAND_MARGIN_X,
    y: nameBandBottom,
    width: coverW,
    height: nameBandH,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  const participantName = data.participantName.trim() || "Participant";
  const maxNameWidth = coverW - 24;
  const fontSizeName = fitNameFontSize(participantName, fontName, maxNameWidth, 30, 16);
  const nameWidth = fontName.widthOfTextAtSize(participantName, fontSizeName);
  const nameBaseline = nameBandBottom + nameBandH * 0.38;

  page.drawText(participantName, {
    x: width / 2 - nameWidth / 2,
    y: nameBaseline,
    size: fontSizeName,
    font: fontName,
    color: nameColor,
  });

  const categoryY = nameBandBottom - 26;
  page.drawText(data.categoryTitle, {
    x: width / 2 - font.widthOfTextAtSize(data.categoryTitle, fontSizeCategory) / 2,
    y: categoryY,
    size: fontSizeCategory,
    font,
    color: bodyTextColor,
  });

  const dateStr = `Date: ${data.date ?? ""}`.trim();
  if (data.date) {
    page.drawText(dateStr, {
      x: 72,
      y: 72,
      size: fontSizeDate,
      font,
      color: bodyTextColor,
    });
    page.drawText(E_SIGN_LABEL, {
      x: 72,
      y: 56,
      size: fontSizeSign,
      font,
      color: rgb(0.3, 0.3, 0.4),
    });
  }
}

/**
 * Loads the participation certificate template and fills contestant name + category.
 * Prefers `CoastFashionAwards2026ParticipationCertificate.pdf` (artwork untouched except text overlay).
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const { filePath, minimalOverlay } = resolveTemplatePath();
  const templateBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontName = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  if (minimalOverlay) {
    drawMinimalOverlay(page, width, height, data.participantName, data.categoryTitle, fontName, fontBody);
  } else {
    drawLegacyOverlay(page, width, height, data, fontBody, fontName);
  }

  return pdfDoc.save();
}
