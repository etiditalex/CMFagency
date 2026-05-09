"use client";

import Link from "next/link";
import Image from "next/image";
import { Megaphone, PhoneCall } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const tableOfContents = [
  "Social Media Management",
  "Social Media Marketing",
  "Content strategy",
  "Getting the right mix",
  "NOT SURE HOW TO START?",
  "Social Media Marketing Prices in Kenya",
  "Basic",
  "Standard",
  "Enterprise",
  "Social media marketers in Kenya",
  "Why Choose Us For Your social media marketing?",
  "The best digital marketing agency",
  "Expertise and experience",
  "Multi-Platform Expertise",
  "Data-Driven Insights",
  "What Customers Say About Us",
  "Testimonials",
];

const packages = [
  {
    name: "Basic",
    tagline: "For individuals managing a small business’ social media on their own",
    price: "20,000",
    cadence: "/ Month",
    items: [
      "Monthly Content Calendar.",
      "3 Posts per week",
      "Different Media Formats (Designs, Photos, & Documents)",
      "Unique Graphics and Content",
      "Monthly reports",
      "Account Manager",
    ],
  },
  {
    name: "Standard",
    tagline: "For teams that want to source UGC, track competitors, or create shoppable posts",
    price: "35,000",
    cadence: " / Month",
    items: [
      "5 Posts per week",
      "Different Media Formats (Designs, Photos, gifs, infographics, Documents & Slideshows)",
      "Up to 4 additional design(s) requests monthly.",
      "Unique Graphics and Content",
      "Account Manager",
      "Monthly reports",
      "Posts Written and Designed",
      "2 Free Ads Management Campaigns",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For large companies and agencies that need more accounts, support, or features",
    price: "55,000",
    cadence: " / Month",
    items: [
      "Audit and assessment",
      "Social media chat support",
      "Social media lead generation",
      "Social media event marketing",
      "4 free Ads Management Campaigns",
      "Custom Posts",
      "Custom graphics and content",
      "Dedicated Account Manager",
    ],
  },
];

const whyChooseCards = [
  {
    title: "The best digital marketing agency",
    description: "We focus on measurable results and clear communication — so you always know what’s working and why.",
    iconUrl:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778296052/WhatsApp_Image_2026-05-09_at_06.05.44_eihhsv.jpg",
  },
  {
    title: "Expertise and experience",
    description:
      "We have an experienced social media team dedicated to strategy, creative direction, and campaign performance.",
    iconUrl:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778296052/WhatsApp_Image_2026-05-09_at_06.06.06_menehi.jpg",
  },
  {
    title: "Multi-Platform Expertise",
    description:
      "Whether it’s Facebook, Instagram, X, or LinkedIn, we tailor content and targeting to each platform’s strengths.",
    iconUrl:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778296052/WhatsApp_Image_2026-05-09_at_06.06.22_r6i8xp.jpg",
  },
  {
    title: "Data-Driven Insights",
    description:
      "We monitor and analyze performance metrics to refine creative, audiences, and budgets for better ROI.",
    iconUrl:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778296052/WhatsApp_Image_2026-05-09_at_06.06.36_au73rq.jpg",
  },
];

export default function SocialMediaMarketingPage() {
  const route = "/services/social-media-marketing";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={isManaged ? page?.title ?? "" : "Social Media Marketing"}
        heroLabel={isManaged ? page?.hero_label ?? "" : "SOCIAL MEDIA MANAGEMENT"}
        description={
          isManaged
            ? page?.description ?? ""
            : "At Changer Fusions, we help businesses in Kenya grow awareness, engagement, and conversions through social media strategy, content, community management, and performance-driven campaigns across platforms like Instagram, Facebook, and LinkedIn."
        }
        layout="fullWidth"
        heroVariant="simple"
        introContent={
          <div className="space-y-10">
            <section className="bg-white border border-emerald-300/70 rounded-md p-5 md:p-7 shadow-sm">
              <div className="text-sm md:text-base font-extrabold text-gray-900">Table of Contents</div>
              <ol className="mt-3 space-y-1 text-sm text-gray-800 list-decimal pl-5 leading-relaxed">
                {tableOfContents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>

            <section className="text-gray-700 leading-relaxed">
              <p>
                Our team at Changer Fusions will work with you to find the best social media approach to market your
                business, products, and services. Social media marketing in Kenya has become an essential investment
                for businesses, and maintaining platforms while generating enquiries can take a huge amount of time.
                We help you stay consistent, creative, and strategic while you focus on running your business.
              </p>

              <div className="mt-6 font-semibold text-gray-900">Our social media marketing services include:</div>
              <ul className="mt-3 list-disc pl-6 space-y-2 text-gray-700">
                <li>Social media strategy development</li>
                <li>Content creation and curation</li>
                <li>Social media posting and scheduling</li>
                <li>Community management</li>
                <li>Social media analytics</li>
              </ul>
            </section>

            <section className="pt-4 text-left">
              <div className="text-left text-xs font-extrabold tracking-widest uppercase text-emerald-600">
                CONTENT STRATEGY
              </div>
              <h2 className="text-left mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Getting The Right Mix
              </h2>
              <div className="mt-5 h-1 w-12 rounded-full bg-emerald-500" />

              <div className="text-left mt-8 space-y-5 text-gray-600 leading-relaxed">
                <p>
                  We have a team of experienced social media marketers who can help you create and execute a social
                  media marketing strategy. For every social media package, we design and write catch posts with our
                  own custom designs.
                </p>
                <p>
                  All posts we do are designed to build brand awareness and sell your services or products to
                  prospects. Should you have a specific message you want to display to your audience, we welcome it
                  and incorporate it into our designs.
                </p>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-emerald-500 rounded-xl md:rounded-2xl px-5 py-10 md:px-10 md:py-14">
                <div className="max-w-4xl mx-auto text-center">
                  <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
                    NOT SURE HOW TO START?
                  </h3>
                  <p className="mt-4 text-white/90 leading-relaxed">
                    Changer Fusions will help you choose the right platforms, content mix, and campaign plan to meet
                    your goals — from awareness and engagement to leads and sales.
                  </p>
                  <div className="mt-7 md:mt-8 flex justify-center">
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/10 px-5 py-2.5 md:px-6 md:py-3 font-extrabold text-white hover:bg-white/15 transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>CONTACT US</span>
                    </Link>
                  </div>
                </div>
            </section>

            <section className="pt-2 text-left">
              <h2 className="text-left text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Social Media Marketing Prices In Kenya
              </h2>
              <p className="text-left mt-4 text-gray-600 leading-relaxed max-w-5xl">
                The exact cost depends on your specific needs, which makes it hard to pin down a price. However, for an
                idea of how much you&apos;ll actually pay, you can use our pricing table for guidance.
              </p>
            </section>

            <section className="pt-2">
              <div className="mx-auto max-w-3xl bg-slate-800 py-10">
                <div className="text-center text-white font-extrabold text-xl md:text-2xl">Featured</div>
              </div>
            </section>

            <section className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg.name} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full">
                    <div className="p-6 md:p-7 flex flex-col h-full">
                      <div className="text-lg font-extrabold text-gray-900">{pkg.name}</div>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{pkg.tagline}</p>

                      <div className="mt-7 flex items-end gap-2">
                        <div className="text-4xl md:text-5xl font-extrabold text-emerald-500 leading-none">
                          {pkg.price}
                        </div>
                        <div className="pb-1 text-sm font-bold text-emerald-600">Ksh</div>
                        <div className="pb-1 text-xs font-semibold text-gray-500">{pkg.cadence}</div>
                      </div>

                      <ul className="mt-7 divide-y divide-gray-100">
                        {pkg.items.map((item) => (
                          <li key={item} className="flex items-start gap-3 py-3 text-sm text-gray-700">
                            <span className="mt-1.5 text-emerald-600 font-extrabold">✓</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-6 text-left">
              <div className="text-left text-xs font-extrabold tracking-widest uppercase text-emerald-600">
                SOCIAL MEDIA MARKETERS IN KENYA
              </div>
              <h2 className="text-left mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Why Choose Us For Your Social Media Marketing?
              </h2>
              <div className="mt-5 h-1 w-12 rounded-full bg-emerald-500" />
              <p className="text-left mt-8 text-gray-600 leading-relaxed max-w-5xl">
                Our expert team specializes in crafting tailored social media strategies that resonate with your
                target audience, driving engagement and ultimately boosting your brand&apos;s visibility.
              </p>
            </section>

            <section className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {whyChooseCards.map((card) => (
                  <div key={card.title} className="text-center">
                    <div className="mx-auto h-24 w-24 md:h-28 md:w-28 relative">
                      <Image
                        src={card.iconUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="112px"
                        priority={false}
                      />
                    </div>
                    <h3 className="mt-6 text-xl font-extrabold text-gray-900 leading-snug">{card.title}</h3>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{card.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        }
        backgroundImageUrl={isManaged ? (page?.background_image_url ?? undefined) ?? undefined : undefined}
        icon={Megaphone}
      />
    )
  );
}
