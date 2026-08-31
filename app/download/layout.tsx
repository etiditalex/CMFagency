import { downloadShowcase } from "@/components/services/showcase/content/download";
import { cloudinarySizedUrl } from "@/lib/cloudinary";

export { metadata } from "./metadata";

const heroSrc = downloadShowcase.heroImage.src;
const hero640 = cloudinarySizedUrl(heroSrc, 640);
const hero960 = cloudinarySizedUrl(heroSrc, 960);
const hero1280 = cloudinarySizedUrl(heroSrc, 1280);

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={hero960}
        imageSrcSet={`${hero640} 640w, ${hero960} 960w, ${hero1280} 1280w`}
        imageSizes="(max-width: 1024px) 100vw, 720px"
        fetchPriority="high"
      />
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      {children}
    </>
  );
}
