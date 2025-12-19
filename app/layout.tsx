import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageLoader from "@/components/PageLoader";
import { CartProvider } from "@/contexts/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Changer Fusions Enterprises - Market to Thrive, Market to Exist",
  description: "Changer Fusions Enterprises (CFE) is a forward-thinking marketing strategic partner specializing in blending innovative marketing techniques, cutting-edge technologies, and transformative strategies. We harness the power of marketing as the catalyst for change and innovation.",
  keywords: "Changer Fusions Enterprises, CFE, digital marketing, website development, branding, market research, events marketing, content creation, marketing strategy, business growth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <PageLoader>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </PageLoader>
        </CartProvider>
      </body>
    </html>
  );
}


