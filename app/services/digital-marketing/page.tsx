"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, MousePointerClick, Megaphone, TrendingUp } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const tableOfContents = [
  "Digital Marketing Services in Mombasa: Driving Growth and Success Online",
  "Start marketing your business. Stop copying the competition",
  "We’re a digital marketing agency with a strategic focus",
  "Innovative digital campaigns to grow your business sustainably",
  "SEO Services",
  "PPC Services",
  "Social Media Marketing",
  "What are our digital marketing service strategies?",
];

const focusCards = [
  {
    title: "SEO Services",
    description:
      "One of the most effective digital marketing strategies out there, search engine optimization (SEO) works to improve your website’s rankings in search engine ranking pages (SERPs), so that your site earns more traffic.",
    icon: Search,
    ctaHref: "/services/seo",
    ctaLabel: "View SEO services in Kenya",
  },
  {
    title: "PPC Services",
    description:
      "We’ll advertise your business online through Pay Per Click marketing, ensuring adverts are publicized in the right places, at the right times and to the right people, in order to effectively raise brand awareness and generate leads.",
    icon: MousePointerClick,
    ctaHref: "/contact",
    ctaLabel: "GET STARTED",
  },
  {
    title: "Social Media Marketing",
    description:
      "Social media marketing/advertising is an offshoot of digital marketing in which you pay social media platforms like Facebook, Instagram, or Twitter to display your content to targeted audiences.",
    icon: Megaphone,
    ctaHref: "/services/social-media-marketing",
    ctaLabel: "Explore social media marketing",
  },
] as const;

const b2bBullets = ["Raise brand awareness", "Maximize impact and ROI", "Increase sales", "Generate leads"];

const faqItems = [
  {
    question: "What digital marketing services do you offer in Mombasa?",
    answer:
      "Changer Fusions provides SEO, PPC advertising, social media marketing, email marketing, content strategy, analytics, and conversion rate optimization for businesses in Mombasa and across Kenya.",
  },
  {
    question: "How long does it take to see results from SEO?",
    answer:
      "SEO is a long-term channel. Many sites start to see measurable improvements within 8–12 weeks, but meaningful growth typically builds over 3–6+ months depending on competition, website quality, and content.",
  },
  {
    question: "Do you manage paid ads (PPC) budgets?",
    answer:
      "Yes. We plan, launch and optimize PPC campaigns. Your ad spend is separate from our management fee, and we align budgets to your goals (leads, sales, traffic) and expected cost per result.",
  },
  {
    question: "Can you help with social media marketing for my business?",
    answer:
      "Yes. We help with social media strategy, content direction, campaign setup, targeting, reporting and optimization to grow reach and drive conversions.",
  },
  {
    question: "How do you measure digital marketing performance?",
    answer:
      "We track key metrics based on your goal, such as leads, conversions, revenue, engagement, traffic quality, cost per lead/acquisition, and ROI. Reporting is shared regularly with clear next actions.",
  },
  {
    question: "Do you work with businesses outside Mombasa?",
    answer:
      "Yes. We support clients across Kenya and can run campaigns nationally while tailoring strategy for specific locations and audiences.",
  },
];

export default function DigitalMarketingPage() {
  const route = "/services/digital-marketing";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        layout="fullWidth"
        heroVariant="digitalMarketing"
        title={isManaged ? page?.title ?? "" : "Digital Marketing"}
        heroLabel={isManaged ? page?.hero_label ?? "" : "DIGITAL MARKETING"}
        description={
          isManaged
            ? page?.description ?? ""
            : "Reach your target audience effectively through social media marketing, email campaigns, and online reputation management. We help businesses establish a strong digital presence and drive meaningful engagement."
        }
        introContent={
          <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
            <script
              type="application/ld+json"
              // Keep on-page for AI/SEO, no visual changes.
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: f.answer,
                    },
                  })),
                }),
              }}
            />
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
              Digital Marketing Services in Mombasa: Driving Growth and Success Online
            </h2>
            <p className="mt-3 text-gray-600 leading-relaxed">
              We are a Kenyan digital marketing company that provides honest, bespoke, multi-channel
              digital marketing services to small and large private and public enterprises.
            </p>

            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 md:p-6">
              <div className="text-lg font-extrabold text-gray-900">Table of Contents</div>
              <ol className="mt-3 space-y-1.5 text-sm text-gray-800 list-decimal pl-5">
                {tableOfContents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            <div className="mt-8 space-y-5 text-gray-700 leading-relaxed">
              <p>
                We&apos;ve become a trusted partner for small-to-midsized businesses (SMBs) looking to
                grow through online channels, like search engines, social media, email marketing,
                and more. Your company can increase brand exposure and revenue by utilizing our wide
                range of online marketing services, including web design, search engine optimization
                (SEO), social media marketing, and more.
              </p>

              <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">
                Start marketing your business. Stop copying the competition
              </h3>

              <p>
                Doing marketing for your brand without a proper internet marketing strategy is a
                fail from the word go. Ensure you use appropriate online marketing plan for you to
                be successful. This is exactly why we are here, to help business set a proper online
                marketing and get the return on investment as expected.
              </p>

              <p>
                We are very enthusiastic about discovering new digital marketing opportunities for
                forward-thinking brands looking to push boundaries and make a significant impact.
                Our complete digital marketing strategies assist our clients in moving from
                competitors to market leaders and, more crucially, keeping them there.
              </p>

              <div className="pt-6">
                <div className="text-xs font-extrabold tracking-widest uppercase text-secondary-600">
                  WE&apos;RE A DIGITAL MARKETING AGENCY WITH A STRATEGIC FOCUS.
                </div>
                <h3 className="mt-3 text-2xl md:text-4xl font-extrabold text-gray-900 text-left">
                  Innovative Digital Campaigns To Grow Your Business Sustainably
                </h3>
                <div className="mt-4 h-1 w-14 rounded-full bg-secondary-600" />
                <p className="mt-4 text-gray-600 leading-relaxed">
                  Our agency has a team of digital marketing specialists offering SEO, PPC, social
                  media, content marketing and conversion rate optimization support. We are
                  open-minded and curious about the future of digital marketing because we are eager
                  to learn and grow. You can learn more about our digital marketing services in
                  Kenya, our values, and how we can collaborate to reach your objectives.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                {focusCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <card.icon className="h-8 w-8 text-gray-900" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xl font-extrabold text-gray-900">{card.title}</h4>
                        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{card.description}</p>
                        <div className="mt-6">
                          <Link
                            href={card.ctaHref}
                            className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-extrabold text-secondary-700 hover:text-secondary-800"
                          >
                            <span>{card.ctaLabel}</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <section className="mt-12 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="bg-gray-50 p-6 md:p-10 flex items-center justify-center">
                    <div className="relative w-full max-w-[520px] aspect-square">
                      <Image
                        src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1778229864/social_uzknl3.jpg"
                        alt="Social media marketing illustration"
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 520px"
                        priority
                      />
                    </div>
                  </div>

                  <div className="p-6 md:p-10">
                    <div className="space-y-4 text-gray-600 leading-relaxed">
                      <p>
                        We&apos;re here to help you grow your B2B business and realize its full
                        potential. We have a team of digital marketing experts devoted throughout
                        their careers to finding innovative ways of increasing customer inquiries
                        and driving growth across various industries.
                      </p>
                      <p>
                        When you work with Changer Fusions, you won&apos;t have to worry about being
                        out of the loop regarding your campaigns.
                      </p>
                      <p>
                        Your point of contact will always ensure you know exactly what strategies
                        we&apos;re implementing, how long your campaigns will run, and how much you
                        spend on any initiative.
                      </p>
                      <p>Our digital marketers in Kenya create and manage targeted advertising campaigns that:</p>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {b2bBullets.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-gray-700">
                          <span className="mt-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary-600/15">
                            <span className="h-2.5 w-2.5 rounded-full bg-secondary-600" />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </section>
        }
        backgroundImageUrl={isManaged ? (page?.background_image_url ?? undefined) ?? undefined : undefined}
        icon={TrendingUp}
      />
    )
  );
}

