import { FX_QR_GENERATOR_TITLE, FX_QR_GENERATOR_URL } from "@/lib/fx-qr-code-generator-seo";

export const FX_QR_GENERATOR_SHARE_TEXT =
  "Create free WhatsApp, website, LinkedIn, and TikTok QR codes online. Customize colors and download PNG or SVG — no signup.";

export const FX_QR_GENERATOR_CITATION_LABEL = "Free QR Code Generator Kenya";

export function fxQrGeneratorCitationHtml(): string {
  return `<a href="${FX_QR_GENERATOR_URL}" title="${FX_QR_GENERATOR_TITLE}" rel="noopener">${FX_QR_GENERATOR_CITATION_LABEL}</a>`;
}

export function fxQrGeneratorCitationMarkdown(): string {
  return `[${FX_QR_GENERATOR_CITATION_LABEL}](${FX_QR_GENERATOR_URL})`;
}

export const FX_QR_DIRECTORY_SUBMISSIONS = [
  {
    name: "Google Search Console",
    action: "Submit sitemap and request indexing for the QR generator URL.",
    href: "https://search.google.com/search-console",
  },
  {
    name: "Bing Webmaster Tools",
    action: "Submit the same URL and sitemap for Bing and Copilot discovery.",
    href: "https://www.bing.com/webmasters",
  },
  {
    name: "AlternativeTo",
    action: "List Fusion Xpress FX QR Code Generator as a free alternative to paid QR tools.",
    href: "https://alternativeto.net/",
  },
  {
    name: "Product Hunt",
    action: "Launch the tool with screenshots, use cases, and a clear free positioning.",
    href: "https://www.producthunt.com/",
  },
  {
    name: "SaaSHub",
    action: "Add the generator under free marketing / QR code software categories.",
    href: "https://www.saashub.com/",
  },
  {
    name: "Kenyan business blogs & newsletters",
    action:
      "Pitch a short guest post: “How Kenyan SMEs use WhatsApp QR codes for customer support” with a link to your tool.",
  },
  {
    name: "LinkedIn company page",
    action: "Publish a post with a demo GIF and link — ask partners to reshare.",
    href: "https://www.linkedin.com/",
  },
  {
    name: "Partner & client websites",
    action:
      "Ask event organisers and clients you already work with to add a “Tools we use” or footer link using the HTML snippet below.",
  },
] as const;

export const FX_QR_BACKLINK_OUTREACH_TIPS = [
  "Lead with value: offer the tool free to restaurants, salons, and clinics that need WhatsApp QR menus.",
  "Give bloggers the ready-made HTML or Markdown citation — do not ask for keyword-stuffed anchor text.",
  "Share before/after examples (poster with QR → WhatsApp chat) on Instagram and LinkedIn with the page link in bio or post.",
  "Reply in Kenya business Facebook groups when someone asks how to make a WhatsApp QR code — link only when genuinely helpful.",
  "Track mentions in Google Search Console → Links, and thank sites that cite you (often leads to more links).",
] as const;

export function buildFxQrSocialShareUrls(pageUrl: string = FX_QR_GENERATOR_URL) {
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(`${FX_QR_GENERATOR_SHARE_TEXT} ${pageUrl}`);

  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(FX_QR_GENERATOR_SHARE_TEXT)}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}
