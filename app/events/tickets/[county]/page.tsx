import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CFMA_TICKET_LOCATION_BY_SLUG,
  CFMA_TICKET_LOCATIONS,
  type CfmaTicketLocation,
} from "@/lib/cfma-ticket-locations";
import { cfmaTicketLocationJsonLd } from "@/lib/cfma-ticket-location-structured-data";
import { SITE_URL } from "@/lib/site-url";

type PageProps = { params: Promise<{ county: string }> };

export function generateStaticParams() {
  return CFMA_TICKET_LOCATIONS.map((loc) => ({ county: loc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { county } = await params;
  const loc = CFMA_TICKET_LOCATION_BY_SLUG[county];
  if (!loc) return {};

  const canonical = `${SITE_URL}/events/tickets/${loc.slug}`;

  return {
    title: { absolute: loc.metaTitle },
    description: loc.metaDescription,
    keywords: loc.keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: loc.metaTitle,
      description: loc.metaDescription,
      url: canonical,
      siteName: "Changer Fusions",
      locale: "en_KE",
      images: [
        {
          url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg",
          width: 1200,
          height: 630,
          alt: `${loc.headline} — Coast Fashion & Modelling Awards 2026`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: loc.metaTitle,
      description: loc.metaDescription,
      images: ["https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

function LocationLinks({ currentSlug }: { currentSlug: string }) {
  const others = CFMA_TICKET_LOCATIONS.filter((l) => l.slug !== currentSlug);
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {others.map((loc) => (
        <li key={loc.slug}>
          <Link
            href={`/events/tickets/${loc.slug}`}
            className="inline-flex rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
          >
            CFM tickets {loc.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LocationBody({ loc }: { loc: CfmaTicketLocation }) {
  return (
    <main className="min-h-screen bg-gray-50 pb-16 pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-primary-700">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/events/upcoming" className="hover:text-primary-700">
                Events
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-gray-800">CFM tickets {loc.name}</li>
          </ol>
        </nav>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {loc.headline}
        </h1>
        <p className="mt-2 text-sm font-semibold text-primary-700">{loc.county} · Coast Fashion & Modelling Awards 2026</p>

        <p className="mt-6 text-base leading-relaxed text-gray-700">{loc.intro}</p>
        <p className="mt-4 text-base leading-relaxed text-gray-700">{loc.travelNote}</p>

        <section aria-labelledby="ticket-keywords" className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 id="ticket-keywords" className="text-lg font-bold text-gray-900">
            Official CFM Awards &amp; Changer Fusions tickets
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Search for <strong>CFM Awards tickets</strong>, <strong>coast fashion tickets</strong>, or{" "}
            <strong>Changer Fusions tickets</strong> in {loc.name}? You are on the official checkout path for the Coast
            Fashion &amp; Modelling Awards (CFMA) 2026. Packages start at KES 500 (Regular), KES 1,500 (VIP), and KES
            3,500 (VVIP). Pay with M-Pesa STK, Paystack (card), or Lipa Pole Pole installments.
          </p>
          {loc.nearbyAreas.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              Popular areas we serve in {loc.county}: {loc.nearbyAreas.join(", ")}.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/kcm/cfm-tickets"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary-700"
            >
              Buy CFM tickets now
            </Link>
            <Link
              href="/events/upcoming/coast-fashion-modelling-awards-2026"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Event details
            </Link>
          </div>
        </section>

        <section aria-labelledby="other-locations" className="mt-10">
          <h2 id="other-locations" className="text-base font-bold text-gray-900">
            CFM tickets across Kenya&apos;s coast &amp; Nairobi
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Changer Fusions sells official tickets for fans travelling from Mombasa, Kilifi, Kwale, Voi and Nairobi.
          </p>
          <LocationLinks currentSlug={loc.slug} />
        </section>
      </div>
    </main>
  );
}

export default async function CfmaTicketLocationPage({ params }: PageProps) {
  const { county } = await params;
  const loc = CFMA_TICKET_LOCATION_BY_SLUG[county];
  if (!loc) notFound();

  const jsonLd = cfmaTicketLocationJsonLd(loc);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LocationBody loc={loc} />
    </>
  );
}
