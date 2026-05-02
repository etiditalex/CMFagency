import { montserrat } from "@/lib/fonts";

export { metadata } from "./metadata";

export default function CfmTicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${montserrat.className} antialiased`}>{children}</div>;
}
