import { Metadata } from "next";
import metadataConfig from "./metadata";

export const metadata: Metadata = metadataConfig;

export default function UpcomingEventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

