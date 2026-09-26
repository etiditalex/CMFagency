"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  IDEAL_EVENT_DATE_LABEL,
  IDEAL_EVENT_VENUE,
  categoryLabel,
  formatIssuedDate,
  titleLabel,
  type ContestantCardData,
} from "@/lib/ideal-mr-miss";

function qrPngDataUrl(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-10000px";
    document.body.appendChild(wrap);
    const root = createRoot(wrap);
    root.render(createElement(QRCodeCanvas, { value, size: 280, level: "M", includeMargin: false, bgColor: "#ffffff", fgColor: "#14523a" }));
    window.setTimeout(() => {
      try {
        const canvas = wrap.querySelector("canvas");
        if (!canvas) {
          reject(new Error("Could not generate the QR code"));
          return;
        }
        resolve(canvas.toDataURL("image/png"));
      } finally {
        root.unmount();
        wrap.remove();
      }
    }, 80);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function downloadContestantCard(card: ContestantCardData, qrValue: string): Promise<void> {
  const [qrUrl, logo] = await Promise.all([qrPngDataUrl(qrValue), loadImage(BRAND_LOGO_URL)]);
  const qr = await loadImage(qrUrl);
  if (!qr) throw new Error("Could not draw the QR code");

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 680;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the card");

  ctx.fillStyle = "#165841";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 48);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 22px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Kenya’s Ideal Mr & Miss", 56, 78);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 54px sans-serif";
  const name = card.fullName.length > 28 ? `${card.fullName.slice(0, 26)}…` : card.fullName;
  ctx.fillText(name, 56, 146);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 860, 48, 164, 164, 24);
  ctx.fill();
  ctx.drawImage(qr, 876, 64, 132, 132);

  const fields: Array<[string, string]> = [
    ["Application no.", card.applicationCode],
    ["Title", titleLabel(card.applyingAs)],
    ["Category", categoryLabel(card.category)],
    ["Town and county", card.townCounty],
    ["Venue", IDEAL_EVENT_VENUE],
    ["Event date", IDEAL_EVENT_DATE_LABEL],
    ["Issued", formatIssuedDate(card.issuedOn)],
  ];

  fields.forEach((field, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 56 : 560;
    const y = 240 + row * 92;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "500 22px sans-serif";
    ctx.fillText(field[0], x, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px sans-serif";
    const value = field[1].length > 28 ? `${field[1].slice(0, 26)}…` : field[1];
    ctx.fillText(value, x, y + 38);
  });

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 56, 580, 180, 64, 18);
  ctx.fill();
  if (logo) {
    const scale = Math.min(150 / logo.width, 44 / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    ctx.drawImage(logo, 56 + (180 - w) / 2, 580 + (64 - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#165841";
    ctx.font = "700 18px sans-serif";
    ctx.fillText("Changer Fusions", 78, 618);
  }

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 820, 586, 200, 56, 28);
  ctx.fill();
  ctx.fillStyle = "#165841";
  ctx.font = "700 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Applied", 920, 622);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${card.applicationCode}-kenyas-ideal-mr-miss.png`;
  link.click();
}
