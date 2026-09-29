export { metadata } from "./metadata";
import TeamJsonLd from "./TeamJsonLd";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TeamJsonLd />
      {children}
    </>
  );
}
