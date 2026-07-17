import { NextRequest, NextResponse } from "next/server";

import { requireFusionPortalInvoiceAccess } from "@/lib/fusion-require-admin";
import {
  buildSmartManagementInvoicePdfBytes,
  buildSmartManagementInvoicePdfFilename,
} from "@/lib/visitors/smart-management-invoice-pdf";
import { parsePaidVisitorPlan, type PaidVisitorPlan } from "@/lib/visitors/subscription-pricing";

export const dynamic = "force-dynamic";

const MAX_NOTES = 1200;

function sanitizeFilenameLabel(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
}

type SmartManagementInvoicePdfRequestBody = {
  billToName?: string;
  billToEmail?: string;
  billToPhone?: string;
  billToAddress?: string;
  plan?: string;
  totalAmountKes?: number;
  notes?: string;
  dueDateIso?: string | null;
  paymentMethod?: "cash" | "mpesa" | "cash_or_mpesa";
};

export async function POST(req: NextRequest) {
  const auth = await requireFusionPortalInvoiceAccess(req);
  if ("error" in auth) return auth.error;

  let payload: SmartManagementInvoicePdfRequestBody;
  try {
    payload = (await req.json()) as SmartManagementInvoicePdfRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const billToName = String(payload.billToName ?? "").trim();
  if (!billToName) {
    return NextResponse.json({ error: "billToName is required" }, { status: 400 });
  }

  const plan: PaidVisitorPlan | null = parsePaidVisitorPlan(payload.plan);
  if (!plan) {
    return NextResponse.json({ error: "plan must be professional or enterprise" }, { status: 400 });
  }

  const totalAmountKes = Math.round(Number(payload.totalAmountKes));
  if (!Number.isFinite(totalAmountKes) || totalAmountKes < 0) {
    return NextResponse.json({ error: "totalAmountKes must be a valid non-negative amount (KSh)" }, { status: 400 });
  }

  const paymentRaw = String(payload.paymentMethod ?? "cash").toLowerCase();
  const paymentMethod: "cash" | "mpesa" | "cash_or_mpesa" =
    paymentRaw === "mpesa" ? "mpesa" : paymentRaw === "cash_or_mpesa" ? "cash_or_mpesa" : "cash";

  const notes = String(payload.notes ?? "").trim().slice(0, MAX_NOTES) || undefined;
  const dueRaw = payload.dueDateIso != null ? String(payload.dueDateIso).trim() : "";
  const dueDateIso = dueRaw ? dueRaw : null;

  const now = new Date();
  const y = now.getFullYear();
  const invoiceRef = `SMI-${y}-${String(Math.floor(Math.random() * 900000) + 100000)}`;

  const pdfBytes = await buildSmartManagementInvoicePdfBytes({
    billToName,
    billToEmail: String(payload.billToEmail ?? "").trim() || undefined,
    billToPhone: String(payload.billToPhone ?? "").trim() || undefined,
    billToAddress: String(payload.billToAddress ?? "").trim() || undefined,
    plan,
    totalAmountKes,
    notes,
    dueDateIso,
    invoiceRef,
    paymentMethod,
  });

  const safeLabel = sanitizeFilenameLabel(billToName);
  const filename = buildSmartManagementInvoicePdfFilename(safeLabel || "CLIENT", now);

  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const star = encodeURIComponent(filename);

  const pdfBuffer = Buffer.from(pdfBytes);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallback.replace(/"/g, "")}"; filename*=UTF-8''${star}`,
      "Cache-Control": "no-store",
      "X-Invoice-Reference": invoiceRef,
    },
  });
}
