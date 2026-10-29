import localFont from "next/font/local";

/** Self-hosted so production builds do not fetch Google Fonts. */
export const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const playfair = localFont({
  src: [
    { path: "../fonts/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const montserratHeavyItalic = localFont({
  src: "../fonts/montserrat-latin-800-italic.woff2",
  weight: "800",
  style: "italic",
  display: "swap",
});
