"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialShare from "@/components/SocialShare";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <SocialShare />
      <Footer />
      <CookieBanner />
      <WhatsAppButton />
    </>
  );
}
