import { Metadata } from "next";
import metadataConfig from "./metadata";

export const metadata: Metadata = metadataConfig;

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

