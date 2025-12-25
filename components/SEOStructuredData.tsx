"use client";

import StructuredData from "./StructuredData";

export default function SEOStructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Changer Fusions",
    url: "https://changerfusions.com",
    logo: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
    description: "Changer Fusions is a forward-thinking marketing strategic partner specializing in blending innovative marketing techniques, cutting-edge technologies, and transformative strategies.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "AMBALAL BUILDING, NKRUMA ROAD",
      addressLocality: "Mombasa",
      addressRegion: "Mombasa District",
      postalCode: "40305",
      addressCountry: "KE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+254-797-777347",
      contactType: "Customer Service",
      email: "info@cmfagency.co.ke",
      areaServed: "KE",
      availableLanguage: ["en", "sw"],
    },
    sameAs: [
      // Add social media links when available
      // "https://www.facebook.com/changerfusions",
      // "https://www.twitter.com/changerfusions",
      // "https://www.linkedin.com/company/changerfusions",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Changer Fusions",
    url: "https://changerfusions.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://changerfusions.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Marketing Agency Services",
    provider: {
      "@type": "Organization",
      name: "Changer Fusions",
    },
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Marketing Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Digital Marketing",
            description: "Social media marketing, email marketing, and online reputation management",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Website Development & Design",
            description: "Custom websites that are visually appealing and user-friendly",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Branding & Creative Services",
            description: "Brand strategy development, logo design, and graphic design",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Market Research & Analysis",
            description: "Consumer behavior analysis, competitor analysis, and data analytics",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Events Marketing",
            description: "Planning and managing all aspects of events",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Content Creation",
            description: "Creating engaging content including videos and testimonials",
          },
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What services does Changer Fusions offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions offers comprehensive marketing services including digital marketing, website development and design, branding and creative services, market research and analysis, events marketing, and content creation. We help businesses grow with innovative marketing strategies and cutting-edge technologies.",
        },
      },
      {
        "@type": "Question",
        name: "Where is Changer Fusions located?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions is located in Mombasa, Kenya at AMBALAL BUILDING, NKRUMA ROAD, MOMBASA DISTRICT, P.O BOX 281, 40305 - MBITA. We serve clients across Kenya and beyond.",
        },
      },
      {
        "@type": "Question",
        name: "How can I contact Changer Fusions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can contact Changer Fusions by phone at +254 797 777347, by email at info@cmfagency.co.ke, or by visiting our contact page on our website. We also have a WhatsApp button on our website for instant inquiries.",
        },
      },
      {
        "@type": "Question",
        name: "Does Changer Fusions organize events?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Changer Fusions offers comprehensive event management services including event planning, venue sourcing, event marketing and promotion, logistics management, on-site coordination, and post-event reporting. We organize various types of events including corporate events, conferences, workshops, and community events.",
        },
      },
      {
        "@type": "Question",
        name: "What makes Changer Fusions different from other marketing agencies?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions stands out by blending innovative marketing techniques with cutting-edge technologies and transformative strategies. We focus on 'Market to thrive, Market to exist' - emphasizing the importance of marketing for business success. Our comprehensive approach includes in-depth research, data-driven strategies, and a commitment to delivering measurable results.",
        },
      },
    ],
  };

  return (
    <>
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      <StructuredData data={serviceSchema} />
      <StructuredData data={faqSchema} />
    </>
  );
}

