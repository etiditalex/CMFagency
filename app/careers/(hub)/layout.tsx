import CareersJsonLd from "@/components/careers/CareersJsonLd";

export { metadata } from "./metadata";

export default function CareersHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CareersJsonLd />
      {children}
    </>
  );
}
