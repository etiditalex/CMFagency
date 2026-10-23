import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Hub",
  description:
    "Search real-time web trends and content. Get AI-summarized answers with cited sources for your research questions.",
  robots: { index: false, follow: false },
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
