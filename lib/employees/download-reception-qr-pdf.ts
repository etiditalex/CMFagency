"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { QRCodeCanvas } from "qrcode.react";

import { memberTypeLabel } from "@/lib/employees/real-estate";
import { receptionGateQrPayload } from "@/lib/employees/reception-gate";
import type { EmployeeMemberType } from "@/lib/employees/types";

const QR_RENDER_SIZE = 320;

function qrPngDataUrl(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-10000px";
    wrap.style.top = "0";
    document.body.appendChild(wrap);
    const root = createRoot(wrap);
    root.render(
      createElement(QRCodeCanvas, {
        value,
        size: QR_RENDER_SIZE,
        level: "M",
        includeMargin: true,
      })
    );
    window.setTimeout(() => {
      try {
        const canvas = wrap.querySelector("canvas");
        if (!canvas) {
          reject(new Error("Could not generate QR code"));
          return;
        }
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      } finally {
        root.unmount();
        wrap.remove();
      }
    }, 80);
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type DownloadReceptionQrPdfParams = {
  gateToken: string;
  memberType: EmployeeMemberType;
  organizationName?: string;
};

export async function downloadReceptionQrPdf(params: DownloadReceptionQrPdfParams): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only available in the browser.");
  }

  const team = memberTypeLabel(params.memberType);
  const qrValue = receptionGateQrPayload(params.gateToken, window.location.origin);
  const dataUrl = await qrPngDataUrl(qrValue);
  const pngBytes = dataUrlToBytes(dataUrl);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const org = params.organizationName?.trim() || "Fusion Xpress";

  let y = height - 48;
  page.drawText(org, { x: 40, y, size: 11, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 22;
  page.drawText("Reception attendance QR", {
    x: 40,
    y,
    size: 14,
    font: bold,
    color: rgb(0.1, 0.31, 0.55),
  });
  y -= 28;
  page.drawText(`${team} team`, { x: 40, y, size: 20, font: bold });
  y -= 22;
  page.drawText("Mount at reception · scan to open sign-in", {
    x: 40,
    y,
    size: 11,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const qrImage = await pdf.embedPng(pngBytes);
  const qrDim = 240;
  const qrX = (width - qrDim) / 2;
  const qrY = Math.max(100, y - qrDim - 20);
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrDim, height: qrDim });

  let footY = qrY - 32;
  page.drawText("Scan with your phone camera", {
    x: 40,
    y: footY,
    size: 11,
    font: bold,
    color: rgb(0.16, 0.65, 0.38),
  });
  footY -= 16;
  page.drawText(
    "Opens the sign-in page. Choose your name, then sign in or sign out. Directors receive email alerts.",
    {
      x: 40,
      y: footY,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
      maxWidth: width - 80,
    }
  );

  const slug = team.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const bytes = await pdf.save();
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reception-qr-${slug}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
