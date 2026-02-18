"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import CookieBanner from "@/components/CookieBanner";
import DashboardShell from "@/components/dashboard/DashboardShell";

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: true });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
const ChangerWidget = dynamic(() => import("@/components/ChangerWidget"), { ssr: false });

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
        <ChangerWidget />
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
      {/* Changer AI chatbot - avoid on About pages to match design */}
      {!isAboutSection && <ChangerWidget />}
    </>
  );
}
