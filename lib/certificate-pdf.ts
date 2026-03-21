import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs";

export type CertificateData = {
  participantName: string;
  categoryTitle: string;
  date: string; // e.g. "March 14, 2026"
};

const E_SIGN_LABEL = "Digitally signed by CMF Agency";

/** Template includes a static sample name in the hero slot; cover this band then draw the real contestant name. */
const NAME_BAND_MARGIN_X = 72;
/** PDF origin is bottom-left; this band matches the “presented to” name area on the landscape template. */
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

/**
 * Loads the Certificate of Participation template and fills it with contestant data
 * and e-sign. Returns the PDF as a Uint8Array.
 * Template path: public/certificates/CertificateOfParticipation.pdf
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public", "certificates", "CertificateOfParticipation.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontName = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontSizeCategory = 14;
  const fontSizeDate = 11;
  const fontSizeSign = 10;
  const bodyTextColor = rgb(0.1, 0.1, 0.2);
  /** Primary recipient line — bold green to match the printed certificate design */
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
    x: width / 2 - (font.widthOfTextAtSize(data.categoryTitle, fontSizeCategory) / 2),
    y: categoryY,
    size: fontSizeCategory,
    font,
    color: bodyTextColor,
  });

  // Date and e-sign at bottom
  const dateStr = `Date: ${data.date}`;
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

  return pdfDoc.save();
}
