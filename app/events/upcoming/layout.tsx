export { metadata } from "./metadata";
import CfmaEventStructuredData from "@/components/CfmaEventStructuredData";

export default function UpcomingEventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CfmaEventStructuredData />
      {children}
    </>
  );
}

