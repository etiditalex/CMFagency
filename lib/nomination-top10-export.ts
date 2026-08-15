import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { categoryLabel, type ModelNominationCategory } from "@/lib/model-nominations";

export type TopNomineeExportRow = {
  rank: number;
  name: string;
  instagram: string | null;
  nominations: number;
  email: string | null;
  phone: string | null;
};

function fileStamp(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "08";
    const d = parts.find((p) => p.type === "day")?.value ?? "15";
    return `${y}-${m}-${d}`;
  } catch {
    return "export";
  }
}

function slugForCategory(category: ModelNominationCategory): string {
  return category === "top_10_male" ? "top-10-male-models" : "top-10-female-models";
}

function nairobiStamp(): string {
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
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

function pdfSafe(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

export function top10ExportFilename(
  category: ModelNominationCategory,
  format: "xlsx" | "pdf"
): string {
  return `CFMA-2026-${slugForCategory(category)}-${fileStamp()}.${format}`;
}

export async function buildTop10NomineesXlsx(
  category: ModelNominationCategory,
  rows: TopNomineeExportRow[]
): Promise<{ bytes: Uint8Array; filename: string }> {
  const XLSX = await import("xlsx");
  const sheetRows: Array<Record<string, string | number>> = rows.map((r) => ({
    Rank: r.rank,
    Nominee: r.name,
    Nominations: r.nominations,
    Instagram: r.instagram ?? "",
    Email: r.email ?? "",
    Phone: r.phone ?? "",
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    sheetRows.length > 0
      ? sheetRows
      : [{ Rank: "", Nominee: "", Nominations: "", Instagram: "", Email: "", Phone: "" }]
  );
  ws["!cols"] = [{ wch: 8 }, { wch: 32 }, { wch: 14 }, { wch: 28 }, { wch: 32 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Top 10");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
  return {
    bytes: new Uint8Array(buffer),
    filename: top10ExportFilename(category, "xlsx"),
  };
}

export async function buildTop10NomineesPdf(
  category: ModelNominationCategory,
  rows: TopNomineeExportRow[]
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595.27;
  const pageH = 841.89;
  const m = 40;
  const page = doc.addPage([pageW, pageH]);

  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: pageH - 88, width: pageW, height: 88, color: rgb(0.09, 0.08, 0.05) });
  page.drawRectangle({ x: 0, y: pageH - 8, width: pageW, height: 8, color: rgb(0.83, 0.65, 0.15) });

  page.drawText("COAST FASHION AWARDS 2026", {
    x: m,
    y: pageH - 40,
    size: 13,
    font: bold,
    color: rgb(0.83, 0.65, 0.15),
  });
  page.drawText(pdfSafe(categoryLabel(category)), {
    x: m,
    y: pageH - 60,
    size: 16,
    font: bold,
    color: rgb(0.99, 0.97, 0.92),
  });
  page.drawText(`Prepared ${nairobiStamp()} EAT`, {
    x: m,
    y: 28,
    size: 8,
    font,
    color: rgb(0.38, 0.32, 0.2),
  });

  const cols = { rank: m, name: m + 36, noms: pageW - m - 70 };
  let y = pageH - 120;
  page.drawText("#", { x: cols.rank, y, size: 9, font: bold, color: rgb(0.62, 0.45, 0.08) });
  page.drawText("Nominee", { x: cols.name, y, size: 9, font: bold, color: rgb(0.62, 0.45, 0.08) });
  page.drawText("Noms", { x: cols.noms, y, size: 9, font: bold, color: rgb(0.62, 0.45, 0.08) });
  y -= 8;
  page.drawLine({
    start: { x: m, y },
    end: { x: pageW - m, y },
    thickness: 0.8,
    color: rgb(0.83, 0.65, 0.15),
  });
  y -= 18;

  if (rows.length === 0) {
    page.drawText("No nominations yet.", { x: cols.name, y, size: 10, font, color: rgb(0.38, 0.32, 0.2) });
  } else {
    for (const row of rows) {
      const isFirst = row.rank === 1;
      if (isFirst) {
        page.drawRectangle({
          x: m - 4,
          y: y - 4,
          width: pageW - 2 * m + 8,
          height: 18,
          color: rgb(0.96, 0.86, 0.55),
        });
      }
      page.drawText(String(row.rank), {
        x: cols.rank,
        y,
        size: 10,
        font: isFirst ? bold : font,
        color: rgb(0.12, 0.1, 0.06),
      });
      const name = pdfSafe(row.name);
      page.drawText(name.length > 48 ? `${name.slice(0, 47)}...` : name, {
        x: cols.name,
        y,
        size: 10,
        font: isFirst ? bold : font,
        color: rgb(0.12, 0.1, 0.06),
      });
      const noms = String(row.nominations);
      page.drawText(noms, {
        x: cols.noms + 28 - font.widthOfTextAtSize(noms, 10),
        y,
        size: 10,
        font: isFirst ? bold : font,
        color: rgb(0.12, 0.1, 0.06),
      });
      y -= 22;
      if (row.instagram) {
        page.drawText(pdfSafe(row.instagram), {
          x: cols.name,
          y,
          size: 8,
          font,
          color: rgb(0.38, 0.32, 0.2),
        });
        y -= 16;
      }
    }
  }

  return {
    bytes: await doc.save(),
    filename: top10ExportFilename(category, "pdf"),
  };
}

export function saveExportBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
