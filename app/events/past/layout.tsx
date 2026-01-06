import { Metadata } from "next";
import metadataConfig from "./metadata";

export const metadata: Metadata = metadataConfig;

export default function PastEventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

