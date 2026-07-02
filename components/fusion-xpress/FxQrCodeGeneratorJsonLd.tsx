import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  FX_QR_GENERATOR_DESCRIPTION,
  FX_QR_GENERATOR_FAQ,
  FX_QR_GENERATOR_HOW_TO_STEPS,
  FX_QR_GENERATOR_SHORT_ANSWER,
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
        alternateName: ["CMF Agency", "Changer Fusions Kenya"],
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
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: [".fx-qr-speakable-summary", ".fx-qr-howto-summary"],
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${FX_QR_GENERATOR_URL}/opengraph-image`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${FX_QR_GENERATOR_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Fusion Xpress", item: `${SITE_URL}/fusion-xpress` },
          { "@type": "ListItem", position: 3, name: "Free QR Code Generator", item: FX_QR_GENERATOR_URL },
        ],
      },
      {
        "@type": "WebApplication",
        "@id": `${FX_QR_GENERATOR_URL}#webapp`,
        name: "Free QR Code Generator",
        alternateName: "FX QR Code Generator",
        url: FX_QR_GENERATOR_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        description: FX_QR_GENERATOR_SHORT_ANSWER,
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
          "SVG download",
        ],
        provider: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "HowTo",
        "@id": `${FX_QR_GENERATOR_URL}#howto`,
        name: "How to create a free QR code online",
        description: FX_QR_GENERATOR_SHORT_ANSWER,
        totalTime: "PT2M",
        tool: { "@id": `${FX_QR_GENERATOR_URL}#webapp` },
        step: FX_QR_GENERATOR_HOW_TO_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${FX_QR_GENERATOR_URL}#fx-qr-howto-heading`,
        })),
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
