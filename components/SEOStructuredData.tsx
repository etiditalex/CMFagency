"use client";

import StructuredData from "./StructuredData";

export default function SEOStructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://cmfagency.co.ke/#organization",
    name: "Changer Fusions",
    alternateName: [
      "Changer Fusions",
      "CMF Agency",
      "Changer Fusions - Marketing Agency in Ambalal",
    ],
    url: "https://cmfagency.co.ke",
    logo: {
      "@type": "ImageObject",
      url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
      width: 1200,
      height: 630,
    },
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
    description: "Changer Fusions is Kenya's premier marketing agency specializing in digital marketing, website development, branding, event management, and market research. We help businesses across Kenya grow with innovative marketing strategies, cutting-edge technologies, and data-driven solutions. Market to thrive, Market to exist.",
    slogan: "Market to Thrive, Market to Exist",
    foundingDate: "2020",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ambalal Building, Nkruma Road",
      addressLocality: "Ambalal",
      addressRegion: "Mombasa County",
      postalCode: "80100",
      addressCountry: "KE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -4.0435,
      longitude: 39.6682,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+254-797-777347",
        contactType: "Customer Service",
        email: "info@cmfagency.co.ke",
        areaServed: ["KE", "Africa"],
        availableLanguage: ["en", "sw"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+254-797-777347",
        contactType: "Sales",
        email: "info@cmfagency.co.ke",
        areaServed: ["KE"],
      },
    ],
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
    knowsAbout: [
      "Digital Marketing",
      "Website Development",
      "Branding",
      "Event Management",
      "Market Research",
      "Content Creation",
      "SEO",
      "Social Media Marketing",
    ],
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
    url: "https://cmfagency.co.ke",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://cmfagency.co.ke/search?q={search_term_string}",
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
          text: "Changer Fusions offers comprehensive marketing services including digital marketing (SEO, social media, email marketing), website development and design, branding and creative services (logo design, brand identity), market research and analysis, events marketing and management, and content creation (videos, graphics, copywriting). We help businesses across Kenya grow with innovative marketing strategies and cutting-edge technologies.",
        },
      },
      {
        "@type": "Question",
        name: "Where is Changer Fusions located?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions is located in Ambalal, Mombasa, Kenya at Ambalal Building, Nkruma Road. We are a marketing agency in Ambalal serving clients across Kenya including Nairobi, Mombasa, Kisumu, and beyond.",
        },
      },
      {
        "@type": "Question",
        name: "How can I contact Changer Fusions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can contact Changer Fusions by phone at +254 797 777347, by email at info@cmfagency.co.ke, or by visiting our contact page at https://cmfagency.co.ke/contact. We also have a WhatsApp button on our website for instant inquiries and support.",
        },
      },
      {
        "@type": "Question",
        name: "Does Changer Fusions organize events?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Changer Fusions offers comprehensive event management services including event planning, venue sourcing, event marketing and promotion, logistics management, on-site coordination, and post-event reporting. We organize various types of events including corporate events, conferences, workshops, product launches, and community events throughout Kenya.",
        },
      },
      {
        "@type": "Question",
        name: "What makes Changer Fusions different from other marketing agencies in Kenya?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions stands out by blending innovative marketing techniques with cutting-edge technologies and transformative strategies. We focus on 'Market to thrive, Market to exist' - emphasizing the critical importance of marketing for business success. Our comprehensive approach includes in-depth research, data-driven strategies, measurable results, and a commitment to helping businesses grow. We combine digital marketing expertise with creative branding and strategic event management to deliver holistic marketing solutions.",
        },
      },
      {
        "@type": "Question",
        name: "Does Changer Fusions provide SEO services?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Changer Fusions provides comprehensive SEO (Search Engine Optimization) services to help businesses improve their Google rankings and online visibility. Our SEO services include keyword research, on-page optimization, technical SEO, content optimization, link building, and local SEO for businesses in Kenya.",
        },
      },
      {
        "@type": "Question",
        name: "What areas in Kenya does Changer Fusions serve?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Changer Fusions serves clients across Kenya including Mombasa, Nairobi, Kisumu, Nakuru, Eldoret, and other major cities. While we are based in Mombasa, we work with businesses throughout Kenya and can provide remote services or travel for on-site consultations when needed.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I buy tickets online for CMF Awards 2026 in Mombasa?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can buy tickets online for Coast Fashion & Modelling Awards 2026 (CMF Awards 2026) at https://cmfagency.co.ke/events/upcoming. The event takes place on 15th August 2026 in Mombasa, Kenya. Early bird tickets start from KES 500 (Regular), KES 1500 (VIP), and KES 3500 (VVIP). Payment via Visa, Mastercard, M-Pesa or Airtel Money.",
        },
      },
      {
        "@type": "Question",
        name: "What events are happening in Mombasa 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Coast Fashion & Modelling Awards 2026 (CMF Awards 2026) is a major event in Mombasa on 15th August 2026. It celebrates heritage, empowers youth talent, and advances sustainable fashion and eco-tourism. Buy tickets online at cmfagency.co.ke/events/upcoming.",
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://cmfagency.co.ke",
      },
    ],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://cmfagency.co.ke/#localbusiness",
    name: "Changer Fusions - Marketing Agency in Ambalal",
    alternateName: ["Changer Fusions", "Marketing agency in Ambalal", "CMF Agency"],
    description: "Changer Fusions is a marketing agency in Ambalal, Mombasa, Kenya. Offering digital marketing, website development, branding, event management, and market research. Based at Ambalal Building, Nkruma Road.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
    url: "https://cmfagency.co.ke",
    telephone: "+254-797-777347",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ambalal Building, Nkruma Road",
      addressLocality: "Ambalal",
      addressRegion: "Mombasa County",
      postalCode: "80100",
      addressCountry: "KE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -4.0435,
      longitude: 39.6682,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ],
      opens: "09:00",
      closes: "17:00",
    },
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
  };

  return (
    <>
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      <StructuredData data={serviceSchema} />
      <StructuredData data={faqSchema} />
      <StructuredData data={localBusinessSchema} />
      <StructuredData data={breadcrumbSchema} />
    </>
  );
}

