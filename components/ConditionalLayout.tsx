"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import DashboardShell from "@/components/dashboard/DashboardShell";

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
  const isAboutSection = pathname?.startsWith("/about");

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

  // Dashboard uses its own shell layout (sidebar + top bar).
  if (isDashboard) {
    return (
      <>
        <DashboardShell>{children}</DashboardShell>
        <CookieBanner />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
      {/* Avoid floating WhatsApp button on About pages (matches requested design without green overlay button) */}
      {!isAboutSection && <WhatsAppButton />}
    </>
  );
}
