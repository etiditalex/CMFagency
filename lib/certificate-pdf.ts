import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs";

export type CertificateData = {
  participantName: string;
  categoryTitle: string;
  date: string; // e.g. "March 14, 2026"
};

const E_SIGN_LABEL = "Digitally signed by CMF Agency";

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
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSizeName = 24;
  const fontSizeCategory = 14;
  const fontSizeDate = 11;
  const fontSizeSign = 10;
  const textColor = rgb(0.1, 0.1, 0.2);

  // Place name roughly in upper-center (adjust y to match your template)
  const nameY = height * 0.52;
  page.drawText(data.participantName, {
    x: width / 2 - (fontBold.widthOfTextAtSize(data.participantName, fontSizeName) / 2),
    y: nameY,
    size: fontSizeName,
    font: fontBold,
    color: textColor,
  });

  // Category below name
  const categoryY = nameY - 36;
  page.drawText(data.categoryTitle, {
    x: width / 2 - (font.widthOfTextAtSize(data.categoryTitle, fontSizeCategory) / 2),
    y: categoryY,
    size: fontSizeCategory,
    font,
    color: textColor,
  });

  // Date and e-sign at bottom
  const dateStr = `Date: ${data.date}`;
  page.drawText(dateStr, {
    x: 72,
    y: 72,
    size: fontSizeDate,
    font,
    color: textColor,
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
