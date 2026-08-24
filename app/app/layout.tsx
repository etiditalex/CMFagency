import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fusion Xpress",
  description:
    "Employee, Smart Visitor Management, ticketing, and voting on the live CMF Agency site.",
  robots: { index: false, follow: false },
  manifest: "/android-shell-manifest.webmanifest",
};

export default function AndroidShellLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.className}>{children}</div>;
}
