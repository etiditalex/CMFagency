export { metadata } from "./metadata";
import NominateModelStructuredData from "@/components/NominateModelStructuredData";

export default function NominateModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NominateModelStructuredData />
      {children}
    </>
  );
}
