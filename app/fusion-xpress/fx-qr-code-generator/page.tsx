import type { Metadata } from "next";
import FxQrCodeGeneratorClient from "./FxQrCodeGeneratorClient";

export const metadata: Metadata = {
  title: "FX QR Code Generator | Fusion Xpress",
  description:
    "Create and download QR codes for WhatsApp, websites, LinkedIn, TikTok, and custom links with Changer Fusions Fusion Xpress.",
  alternates: {
    canonical: "/fusion-xpress/fx-qr-code-generator",
  },
  openGraph: {
    title: "FX QR Code Generator | Fusion Xpress",
    description:
      "Create and download branded QR codes for WhatsApp and social links with Fusion Xpress.",
    url: "https://cmfagency.co.ke/fusion-xpress/fx-qr-code-generator",
    siteName: "Changer Fusions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FX QR Code Generator | Fusion Xpress",
    description:
      "Create and download branded QR codes for WhatsApp, websites, LinkedIn, TikTok, and custom URLs.",
  },
  keywords: [
    "QR code generator",
    "WhatsApp QR code",
    "LinkedIn QR code",
    "TikTok QR code",
    "Fusion Xpress",
    "Changer Fusions",
  ],
};

export default function FxQrCodeGeneratorPage() {
  return <FxQrCodeGeneratorClient />;
}
