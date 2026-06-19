import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  FX_QR_GENERATOR_DESCRIPTION,
  FX_QR_GENERATOR_FAQ,
  FX_QR_GENERATOR_TITLE,
  FX_QR_GENERATOR_URL,
} from "@/lib/fx-qr-code-generator-seo";
import { SITE_URL } from "@/lib/site-url";

export default function FxQrCodeGeneratorJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Changer Fusions",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: BRAND_LOGO_URL },
        address: {
          "@type": "PostalAddress",
          streetAddress: "Ambalal Building, Nkruma Road",
          addressLocality: "Mombasa",
          addressCountry: "KE",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Changer Fusions",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${FX_QR_GENERATOR_URL}#webpage`,
        url: FX_QR_GENERATOR_URL,
        name: FX_QR_GENERATOR_TITLE,
        description: FX_QR_GENERATOR_DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${FX_QR_GENERATOR_URL}#webapp` },
        inLanguage: "en-KE",
        breadcrumb: { "@id": `${FX_QR_GENERATOR_URL}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${FX_QR_GENERATOR_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Fusion Xpress", item: `${SITE_URL}/fusion-xpress` },
          { "@type": "ListItem", position: 3, name: "FX QR Code Generator", item: FX_QR_GENERATOR_URL },
        ],
      },
      {
        "@type": "WebApplication",
        "@id": `${FX_QR_GENERATOR_URL}#webapp`,
        name: "FX QR Code Generator",
        url: FX_QR_GENERATOR_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        description: FX_QR_GENERATOR_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KES",
        },
        featureList: [
          "WhatsApp QR code generation",
          "Website link QR codes",
          "LinkedIn profile QR codes",
          "TikTok link QR codes",
          "Custom URL QR codes",
          "Color customization",
          "Mobile preview",
          "PNG download",
        ],
        provider: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${FX_QR_GENERATOR_URL}#faq`,
        mainEntity: FX_QR_GENERATOR_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
  );
}
