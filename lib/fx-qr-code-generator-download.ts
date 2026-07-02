export type QrChannel = "whatsapp" | "website" | "linkedin" | "tiktok" | "custom";
export type QrDownloadFormat = "png" | "svg";

const CHANNEL_BASENAMES: Record<QrChannel, string> = {
  whatsapp: "whatsapp-qr-code",
  website: "website-link-qr-code",
  linkedin: "linkedin-profile-qr-code",
  tiktok: "tiktok-link-qr-code",
  custom: "custom-url-qr-code",
};

function slugifyFilename(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || ""
  );
}

/** Download basename from the user's label or QR type — never branded "fx-qr-code". */
export function buildQrDownloadBasename(options: { label: string; channel: QrChannel }): string {
  const fromLabel = slugifyFilename(options.label);
  if (fromLabel) return fromLabel;
  return CHANNEL_BASENAMES[options.channel];
}

export function buildQrDownloadFilename(options: {
  label: string;
  channel: QrChannel;
  format: QrDownloadFormat;
}): string {
  return `${buildQrDownloadBasename(options)}.${options.format}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function downloadQrSvg(options: {
  svg: SVGSVGElement;
  label: string;
  channel: QrChannel;
}) {
  const serializer = new XMLSerializer();
  const markup = serializer.serializeToString(options.svg);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  triggerBlobDownload(
    blob,
    buildQrDownloadFilename({ label: options.label, channel: options.channel, format: "svg" })
  );
}

export function downloadQrPng(options: {
  svg: SVGSVGElement;
  bgColor: string;
  label: string;
  channel: QrChannel;
  qrPixelSize?: number;
}): Promise<void> {
  const { svg, bgColor, label, channel, qrPixelSize = 1200 } = options;
  const caption = label.trim();
  const captionBand = caption ? 96 : 0;
  const canvasSize = qrPixelSize + captionBand;

  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new window.Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Download failed. Please try again."));
        return;
      }

      context.fillStyle = bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, qrPixelSize, qrPixelSize);

      if (caption) {
        context.fillStyle = "#111827";
        context.font = "bold 42px system-ui, -apple-system, Segoe UI, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(caption, canvasSize / 2, qrPixelSize + captionBand / 2);
      }

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error("Download failed. Please try again."));
          return;
        }
        triggerBlobDownload(
          blob,
          buildQrDownloadFilename({ label, channel, format: "png" })
        );
        resolve();
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Download failed. Please try again."));
    };

    img.src = url;
  });
}
