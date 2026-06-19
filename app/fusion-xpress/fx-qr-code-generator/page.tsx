import type { Metadata } from "next";
import FxQrCodeGeneratorJsonLd from "@/components/fusion-xpress/FxQrCodeGeneratorJsonLd";
import {
  FX_QR_GENERATOR_DESCRIPTION,
  FX_QR_GENERATOR_KEYWORDS,
  FX_QR_GENERATOR_PATH,
  FX_QR_GENERATOR_TITLE,
  FX_QR_GENERATOR_URL,
} from "@/lib/fx-qr-code-generator-seo";
import { SITE_URL } from "@/lib/site-url";
import FxQrCodeGeneratorClient from "./FxQrCodeGeneratorClient";

export const metadata: Metadata = {
  title: {
    absolute: FX_QR_GENERATOR_TITLE,
  },
  description: FX_QR_GENERATOR_DESCRIPTION,
  applicationName: "Fusion Xpress",
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  category: "technology",
  keywords: [...FX_QR_GENERATOR_KEYWORDS],
  alternates: {
    canonical: FX_QR_GENERATOR_PATH,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: FX_QR_GENERATOR_URL,
    siteName: "Changer Fusions",
    title: FX_QR_GENERATOR_TITLE,
    description: FX_QR_GENERATOR_DESCRIPTION,
    images: [
      {
        url: `${FX_QR_GENERATOR_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "FX QR Code Generator by Changer Fusions Fusion Xpress",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: FX_QR_GENERATOR_TITLE,
    description: FX_QR_GENERATOR_DESCRIPTION,
    images: [`${FX_QR_GENERATOR_URL}/opengraph-image`],
  },
};

export default function FxQrCodeGeneratorPage() {
  return (
    <>
      <FxQrCodeGeneratorJsonLd />
      <FxQrCodeGeneratorClient />
    </>
  );
}
