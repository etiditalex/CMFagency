"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import CookieBanner from "@/components/CookieBanner";

const DashboardShell = dynamic(() => import("@/components/dashboard/DashboardShell"), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-9 w-9 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: true });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
const ScrollToTopButton = dynamic(() => import("@/components/ScrollToTopButton"), { ssr: false });

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isVerifyEmailPage = pathname === "/verify-email";
  const isDashboard = pathname?.startsWith("/dashboard");

  // For verify-email pages, hide navbar and show full-screen layout
  if (isVerifyEmailPage) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
        <CookieBanner />
        <ScrollToTopButton />
      </div>
    );
  }

  // Dashboard uses its own shell layout (sidebar + top bar).
  if (isDashboard) {
    return (
      <>
        <DashboardShell>{children}</DashboardShell>
        <CookieBanner />
        <ScrollToTopButton />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
      <ScrollToTopButton />
    </>
  );
}
