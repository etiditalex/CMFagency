"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialShare from "@/components/SocialShare";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import CfmaPopupBanner from "@/components/CfmaPopupBanner";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isVerifyEmailPage = pathname === "/verify-email";
  const isTeamPage = pathname === "/about/team";
  const isFusionXpress = pathname === "/fusion-xpress";
  const isDashboard = pathname?.startsWith("/dashboard");

  // For verify-email pages, hide navbar and show full-screen layout
  if (isVerifyEmailPage) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
        <CookieBanner />
        <WhatsAppButton />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <CfmaPopupBanner />
      {/* Keep admin pages clean: no floating social share widget */}
      {!isTeamPage && !isFusionXpress && !isDashboard && <SocialShare />}
      <Footer />
      <CookieBanner />
      <WhatsAppButton />
    </>
  );
}
