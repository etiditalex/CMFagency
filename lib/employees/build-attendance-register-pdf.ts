import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { buildAttendanceDailyLogRows } from "@/lib/employees/attendance-daily-log";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import type { EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";

export type AttendanceRegisterPdfMeta = {
  organizationName?: string;
  from: string;
  to: string;
  /** daily | weekly | monthly | custom */
  periodLabel?: string;
};

function orgSlug(organizationName?: string): string {
  return (
    (organizationName ?? "organisation")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "attendance"
  );
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Landscape A4 PDF attendance register for email digests.
 */
export async function buildAttendanceRegisterPdfBuffer(
  events: AttendanceSummaryEventRow[],
  employees: EmployeeRecord[],
  meta: AttendanceRegisterPdfMeta,
  reportingSettings?: EmployeeReportingSettings,
  leaveRecords?: EmployeeLeaveRecord[]
): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
  const logRows = buildAttendanceDailyLogRows(events, employees, reportingSettings, {
    leaveRecords,
    from: meta.from,
    to: meta.to,
  });
  const shiftEnabled = reportingSettings?.shiftEnabled === true;
  const org = meta.organizationName?.trim() || "Organisation";
  const period =
    meta.periodLabel?.trim() ||
    (meta.from === meta.to ? meta.from : `${meta.from} to ${meta.to}`);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginX = 28;
  const marginTop = 36;
  const rowH = 14;
  const headerH = 16;
  const fontSize = 8;
  const headerSize = 8;

  type Col = { key: string; label: string; width: number };
  const cols: Col[] = [
    { key: "fullName", label: "Name", width: 110 },
    { key: "memberId", label: "Member ID", width: 70 },
    { key: "department", label: "Department", width: 80 },
    { key: "status", label: "Status", width: 48 },
    { key: "signInDate", label: "Date", width: 70 },
    { key: "signInTime", label: "Sign in", width: 55 },
    { key: "signOutTime", label: "Sign out", width: 90 },
    { key: "hoursWorked", label: "Hours", width: 50 },
  ];
  if (shiftEnabled) {
    cols.splice(4, 0, { key: "shiftLabel", label: "Shift", width: 48 });
  }

  const totalColW = cols.reduce((s, c) => s + c.width, 0);
  const scale = (pageWidth - marginX * 2) / totalColW;
  const scaled = cols.map((c) => ({ ...c, width: c.width * scale }));

  const drawHeader = (page: ReturnType<typeof doc.addPage>, y: number) => {
    page.drawText("Fusion Xpress · Attendance register", {
      x: marginX,
      y: pageHeight - 22,
      size: 12,
      font: bold,
      color: rgb(0.12, 0.16, 0.22),
    });
    page.drawText(org, {
      x: marginX,
      y: pageHeight - 36,
      size: 9,
      font,
      color: rgb(0.3, 0.35, 0.4),
    });
    page.drawText(period, {
      x: pageWidth - marginX - bold.widthOfTextAtSize(period, 9),
      y: pageHeight - 22,
      size: 9,
      font: bold,
      color: rgb(0.17, 0.45, 0.35),
    });
    page.drawText("Times in East Africa Time (EAT)", {
      x: pageWidth - marginX - font.widthOfTextAtSize("Times in East Africa Time (EAT)", 7),
      y: pageHeight - 36,
      size: 7,
      font,
      color: rgb(0.45, 0.5, 0.55),
    });

    let x = marginX;
    page.drawRectangle({
      x: marginX,
      y: y - 3,
      width: pageWidth - marginX * 2,
      height: headerH,
      color: rgb(0.12, 0.35, 0.45),
    });
    for (const col of scaled) {
      page.drawText(col.label, {
        x: x + 3,
        y: y + 2,
        size: headerSize,
        font: bold,
        color: rgb(1, 1, 1),
      });
      x += col.width;
    }
  };

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop - 28;
  drawHeader(page, y);
  y -= headerH + 4;

  const cellValue = (row: (typeof logRows)[number], key: string): string => {
    if (key === "status") return row.status === "on_leave" ? "On leave" : "Present";
    const v = (row as Record<string, string>)[key];
    return String(v ?? "—");
  };

  if (logRows.length === 0) {
    page.drawText("No attendance or leave recorded in this period.", {
      x: marginX,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    let alt = false;
    for (const row of logRows) {
      if (y < 40) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop - 28;
        drawHeader(page, y);
        y -= headerH + 4;
        alt = false;
      }
      if (alt) {
        page.drawRectangle({
          x: marginX,
          y: y - 3,
          width: pageWidth - marginX * 2,
          height: rowH,
          color: rgb(0.96, 0.97, 0.98),
        });
      }
      let x = marginX;
      for (const col of scaled) {
        const raw = cellValue(row, col.key);
        const maxChars = Math.max(4, Math.floor(col.width / 4.2));
        page.drawText(truncate(raw, maxChars), {
          x: x + 3,
          y: y + 1,
          size: fontSize,
          font,
          color: rgb(0.15, 0.18, 0.22),
        });
        x += col.width;
      }
      y -= rowH;
      alt = !alt;
    }
  }

  const pageCount = doc.getPageCount();
  for (let i = 0; i < pageCount; i += 1) {
    const p = doc.getPage(i);
    const label = `Page ${i + 1} of ${pageCount}`;
    p.drawText(label, {
      x: pageWidth - marginX - font.widthOfTextAtSize(label, 7),
      y: 16,
      size: 7,
      font,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const bytes = await doc.save();
  const slug = orgSlug(meta.organizationName);
  const filename =
    meta.from === meta.to
      ? `attendance-register-${slug}-${meta.from}.pdf`
      : `attendance-register-${slug}-${meta.from}-to-${meta.to}.pdf`;

  return { buffer: Buffer.from(bytes), filename, rowCount: logRows.length };
}
