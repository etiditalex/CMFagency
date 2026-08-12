import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type GateTicketPurchaseExportRow = {
  reference: string;
  purchased_at: string;
  checked_in_at: string | null;
  revoked_at: string | null;
  campaign: string;
  payer_name: string;
  email: string;
  payer_phone: string;
  referred_by: string;
  referrer_phone: string;
  amount: number;
  currency: string;
  quantity: number;
};

export const GATE_TICKET_PURCHASES_XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const GATE_TICKET_PURCHASES_PDF_MIME = "application/pdf";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function gateStatusLabel(row: GateTicketPurchaseExportRow): string {
  if (row.revoked_at) return `Revoked ${formatDateTime(row.revoked_at)}`;
  if (row.checked_in_at) return formatDateTime(row.checked_in_at);
  return "Not scanned";
}

function slugPart(eventSlug: string | null | undefined): string {
  const s = (eventSlug ?? "all-events").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return s.slice(0, 48) || "all-events";
}

export function ticketPurchasesExportFilename(
  format: "xlsx" | "pdf",
  eventSlug?: string | null
): string {
  const day = new Date().toISOString().slice(0, 10);
  return `gate-ticket-purchases-${slugPart(eventSlug)}-${day}.${format}`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export async function buildTicketPurchasesXlsxBuffer(
  rows: GateTicketPurchaseExportRow[]
): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const sheetRows = rows.map((r) => ({
    Purchased: formatDateTime(r.purchased_at),
    Gate: gateStatusLabel(r),
    Reference: r.reference,
    Campaign: r.campaign,
    Payer: r.payer_name,
    Email: r.email,
    "Payer phone": r.payer_phone,
    Referrer: r.referred_by,
    "Referrer phone": r.referrer_phone,
    Qty: r.quantity,
    Amount: r.amount,
    Currency: r.currency,
    Revoked: r.revoked_at ? formatDateTime(r.revoked_at) : "",
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    sheetRows.length > 0
      ? sheetRows
      : [
          {
            Purchased: "",
            Gate: "",
            Reference: "",
            Campaign: "",
            Payer: "",
            Email: "",
            "Payer phone": "",
            Referrer: "",
            "Referrer phone": "",
            Qty: "",
            Amount: "",
            Currency: "",
            Revoked: "",
          },
        ]
  );
  XLSX.utils.book_append_sheet(wb, ws, "Ticket purchases");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }));
}

export async function buildTicketPurchasesPdfBuffer(
  rows: GateTicketPurchaseExportRow[],
  meta?: { eventTitle?: string | null }
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginX = 22;
  const marginTop = 34;
  const rowH = 13;
  const headerH = 15;
  const fontSize = 7;
  const headerSize = 7;

  type Col = { key: string; label: string; width: number };
  const cols: Col[] = [
    { key: "purchased", label: "Purchased", width: 78 },
    { key: "gate", label: "Gate", width: 78 },
    { key: "reference", label: "Reference", width: 88 },
    { key: "campaign", label: "Campaign", width: 90 },
    { key: "payer", label: "Payer", width: 70 },
    { key: "email", label: "Email", width: 95 },
    { key: "phone", label: "Phone", width: 62 },
    { key: "referrer", label: "Referrer", width: 60 },
    { key: "refPhone", label: "Ref. phone", width: 58 },
    { key: "qty", label: "Qty", width: 28 },
    { key: "amount", label: "Amount", width: 52 },
  ];

  const totalColW = cols.reduce((s, c) => s + c.width, 0);
  const scale = (pageWidth - marginX * 2) / totalColW;
  const scaled = cols.map((c) => ({ ...c, width: c.width * scale }));

  const subtitle = meta?.eventTitle?.trim()
    ? meta.eventTitle.trim()
    : "All events";
  const generated = `Generated ${formatDateTime(new Date().toISOString())} · ${rows.length} purchase${rows.length === 1 ? "" : "s"}`;

  const cellFor = (row: GateTicketPurchaseExportRow, key: string): string => {
    switch (key) {
      case "purchased":
        return formatDateTime(row.purchased_at);
      case "gate":
        return gateStatusLabel(row);
      case "reference":
        return row.reference;
      case "campaign":
        return row.campaign;
      case "payer":
        return row.payer_name;
      case "email":
        return row.email;
      case "phone":
        return row.payer_phone;
      case "referrer":
        return row.referred_by;
      case "refPhone":
        return row.referrer_phone;
      case "qty":
        return String(row.quantity ?? 0);
      case "amount":
        return `${row.currency || ""} ${Number(row.amount).toLocaleString("en-KE")}`.trim();
      default:
        return "";
    }
  };

  const drawHeader = (page: ReturnType<typeof doc.addPage>, y: number) => {
    page.drawText("Fusion Xpress · Gate ticket purchases", {
      x: marginX,
      y: pageHeight - 20,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.16, 0.22),
    });
    page.drawText(subtitle, {
      x: marginX,
      y: pageHeight - 34,
      size: 8,
      font,
      color: rgb(0.3, 0.35, 0.4),
    });
    page.drawText(generated, {
      x: pageWidth - marginX - font.widthOfTextAtSize(generated, 7),
      y: pageHeight - 20,
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
        x: x + 2,
        y: y + 2,
        size: headerSize,
        font: bold,
        color: rgb(1, 1, 1),
      });
      x += col.width;
    }
  };

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop - 24;
  drawHeader(page, y);
  y -= headerH + 4;

  if (rows.length === 0) {
    page.drawText("No ticket purchases for this filter.", {
      x: marginX,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    let alt = false;
    for (const row of rows) {
      if (y < 36) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop - 24;
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
        const raw = cellFor(row, col.key);
        const maxChars = Math.max(4, Math.floor(col.width / 3.8));
        page.drawText(truncate(raw, maxChars), {
          x: x + 2,
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

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
