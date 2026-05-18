"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { QRCodeCanvas } from "qrcode.react";

import { employeeQrPayload } from "@/lib/employees/utils";

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

export type DownloadEmployeeQrPdfParams = {
  token: string;
  fullName: string;
  department?: string;
  jobTitle?: string;
  employeeCode?: string | null;
  organizationName?: string;
};

/** Builds and downloads a printable PDF with the employee's scannable QR pass. */
export async function downloadEmployeeQrPdf(params: DownloadEmployeeQrPdfParams): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only available in the browser.");
  }

  const qrValue = employeeQrPayload(params.token, window.location.origin);
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
  page.drawText("Employee attendance pass", {
    x: 40,
    y,
    size: 14,
    font: bold,
    color: rgb(0.1, 0.31, 0.55),
  });
  y -= 30;
  page.drawText(params.fullName, { x: 40, y, size: 18, font: bold });
  y -= 20;
  if (params.department?.trim()) {
    page.drawText(params.department.trim(), { x: 40, y, size: 12, font });
    y -= 16;
  }
  if (params.jobTitle?.trim()) {
    page.drawText(params.jobTitle.trim(), {
      x: 40,
      y,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 18;
  }
  if (params.employeeCode?.trim()) {
    page.drawText(`ID: ${params.employeeCode.trim()}`, {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 20;
  }

  const qrImage = await pdf.embedPng(pngBytes);
  const qrDim = 220;
  const qrX = (width - qrDim) / 2;
  const qrY = Math.max(120, y - qrDim - 12);
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrDim, height: qrDim });

  let footY = qrY - 28;
  page.drawText("Scan to sign in or sign out", {
    x: 40,
    y: footY,
    size: 11,
    font: bold,
    color: rgb(0.16, 0.65, 0.38),
  });
  footY -= 14;
  page.drawText("Time is recorded automatically. Directors receive an email alert.", {
    x: 40,
    y: footY,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
    maxWidth: width - 80,
  });

  const slug =
    params.fullName
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "employee";
  const bytes = await pdf.save();
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employee-qr-${slug}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
