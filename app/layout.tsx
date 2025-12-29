import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageLoader from "@/components/PageLoader";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import SEOStructuredData from "@/components/SEOStructuredData";
import SocialShare from "@/components/SocialShare";
import { CartProvider } from "@/contexts/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://changerfusions.com"),
  title: {
    default: "Changer Fusions - Market to Thrive, Market to Exist | Marketing Agency Kenya",
    template: "%s | Changer Fusions",
  },
  description: "Changer Fusions is a leading marketing agency in Kenya specializing in digital marketing, website development, branding, event management, and market research. We help businesses grow with innovative marketing strategies and cutting-edge technologies.",
  keywords: [
    "Changer Fusions",
    "marketing agency Kenya",
    "digital marketing Kenya",
    "website development Kenya",
    "branding services Kenya",
    "event management Kenya",
    "market research Kenya",
    "content creation Kenya",
    "marketing strategy Kenya",
    "business growth Kenya",
    "Mombasa marketing agency",
    "Nairobi marketing services",
    "SEO services Kenya",
    "social media marketing Kenya",
    "event planning Kenya",
  ],
  authors: [{ name: "Changer Fusions" }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://changerfusions.com",
    siteName: "Changer Fusions",
    title: "Changer Fusions - Market to Thrive, Market to Exist | Marketing Agency Kenya",
    description: "Leading marketing agency in Kenya offering digital marketing, website development, branding, event management, and market research services.",
    images: [
      {
        url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
        width: 1200,
        height: 630,
        alt: "Changer Fusions - Marketing Agency Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changer Fusions - Market to Thrive, Market to Exist",
    description: "Leading marketing agency in Kenya offering digital marketing, website development, branding, and event management services.",
    images: ["https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: "https://changerfusions.com",
  },
  category: "Marketing Agency",
  other: {
    "geo.region": "KE",
    "geo.placename": "Mombasa",
    "geo.position": "-4.0435;39.6682",
    "ICBM": "-4.0435, 39.6682",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-46VYE6KM7V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-46VYE6KM7V');
          `}
        </Script>
        <SEOStructuredData />
        <CartProvider>
          <PageLoader>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <SocialShare />
            <Footer />
            <CookieBanner />
            <WhatsAppButton />
          </PageLoader>
        </CartProvider>
      </body>
    </html>
  );
}


