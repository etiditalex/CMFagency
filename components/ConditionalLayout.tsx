"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  
  // Hide Navbar and Footer on login and verify-email pages
  const hideLayout = pathname === "/login" || pathname === "/verify-email";

  return (
    <>
      {!hideLayout && <Navbar />}
      <main className={hideLayout ? "" : "min-h-screen"}>{children}</main>
      {!hideLayout && <SocialShare />}
      {!hideLayout && <Footer />}
      {!hideLayout && <CookieBanner />}
      {!hideLayout && <WhatsAppButton />}
    </>
  );
}
