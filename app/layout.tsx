import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import PageLoader from "@/components/PageLoader";
import SEOStructuredData from "@/components/SEOStructuredData";
import ConditionalLayout from "@/components/ConditionalLayout";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://cmfagency.co.ke"),
  title: {
    default: "Changer Fusions - Market to Thrive, Market to Exist | Marketing Agency Kenya",
    template: "%s | Changer Fusions",
  },
  icons: {
    // Use deterministic, local icon routes (no remote fetch).
    icon: [{ url: "/icon", sizes: "any", type: "image/png" }],
    shortcut: "/icon",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  description: "Changer Fusions is Kenya's premier marketing agency specializing in digital marketing, website development, branding, event management, and market research. Based in Mombasa, we help businesses across Kenya grow with innovative marketing strategies, cutting-edge technologies, and data-driven solutions. Market to thrive, Market to exist.",
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
    "best marketing agency Kenya",
    "top marketing company Mombasa",
    "digital marketing services Kenya",
    "web design Kenya",
    "brand identity Kenya",
    "event planning services Kenya",
    "marketing consultancy Kenya",
    "online marketing Kenya",
    "marketing solutions Kenya",
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
    url: "https://cmfagency.co.ke",
    siteName: "Changer Fusions",
    title: "Changer Fusions - Market to Thrive, Market to Exist | Leading Marketing Agency Kenya",
    description: "Kenya's premier marketing agency offering comprehensive digital marketing, website development, branding, event management, and market research services. Based in Mombasa, serving businesses across Kenya with innovative strategies and cutting-edge technologies.",
    images: [
      {
        // If you later add `app/opengraph-image.tsx`, switch this to `/opengraph-image`.
        url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
        width: 1200,
        height: 630,
        alt: "Changer Fusions - Leading Marketing Agency in Kenya | Digital Marketing, Web Development, Branding Services",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changer Fusions - Leading Marketing Agency in Kenya | Market to Thrive, Market to Exist",
    description: "Premier marketing agency in Kenya offering digital marketing, website development, branding, event management, and market research. Helping businesses grow with innovative strategies.",
    images: ["https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"],
    creator: "@changerfusions",
    site: "@changerfusions",
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
    canonical: "https://cmfagency.co.ke",
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
      <body>
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
          <AuthProvider>
            <PageLoader>
              <ConditionalLayout>{children}</ConditionalLayout>
            </PageLoader>
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}


