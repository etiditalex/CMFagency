import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Changer Fusions - Marketing Agency Kenya",
    short_name: "Changer Fusions",
    description: "Leading marketing agency in Kenya offering digital marketing, website development, branding, and event management services.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    icons: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
        sizes: "any",
        type: "image/jpeg",
      },
    ],
  };
}

