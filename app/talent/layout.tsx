import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Talent Showcase — models & creatives",
  description:
    "How Changer Fusions represents models, MCs, and creatives for brands and events in Kenya—from casting and campaigns to the Coast Fashion & Modelling Awards. Apply via our talent pool or contact the Mombasa team.",
  alternates: { canonical: `${SITE_URL}/talent` },
  openGraph: {
    url: `${SITE_URL}/talent`,
    siteName: "Changer Fusions",
    title: "Talent Showcase | Changer Fusions",
    description:
      "Casting, brand work, and event opportunities for models and creatives. Based in Mombasa, serving Kenya—clear process and direct contact.",
    type: "website",
    locale: "en_KE",
  },
};

export default function TalentLayout({ children }: { children: ReactNode }) {
  return children;
}
