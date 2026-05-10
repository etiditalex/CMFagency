"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle, ChevronDown, Phone, Search, Send } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import SeoPackageCheckoutModal from "@/components/service-invoices/SeoPackageCheckoutModal";
import { SEO_SERVICE_PACKAGES } from "@/lib/service-packages-catalog";
import { SEO_SERVICE_FAQ_ITEMS } from "@/lib/seo-service-faq";

const heroImageUrl = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778316586/seo_wfek2p.jpg";

const dashboardImageUrl =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778388669/seo-p_l0lwzl.jpg";

const seoMarketingIllustrationUrl =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778389136/seo_top_oujton.jpg";

const seoServicesKenyaFeatures = {
  colA: ["Technical SEO", "Competitor Analysis", "Local SEO"],
  colB: ["Keyword Researching", "UX Design for SEO", "Content Strategy and Content Marketing"],
} as const;

const seoPackages = [
  {
    id: "basic-seo-plan",
    name: "Basic SEO Plan",
    price: "20,000",
    features: [
      "Local / Regional Focus",
      "Keyword Research (10-30 Keywords)",
      "Analytics Setup & Configuration",
      "Monthly Strategy Discussion",
      "Title Tag & Meta Tag Creation",
      "Internal Link Building (Crosslinking)",
      "Content Editing & Optimization",
      "Basic On-Site Optimization",
      "Monthly Custom Report",
    ],
  },
  {
    id: "standard-seo-plan",
    name: "Standard SEO Plan",
    price: "40,000",
    features: [
      "Competitive Keywords / Nationwide Focus",
      "Keyword Research (50+ Keywords)",
      "Heat Map / Usability Reports",
      "Advanced On-Site / Code Optimization",
      "Conversion Optimization",
      "Technical SEO — (Robots.txt, Sitemap, etc.)",
      "Speed Optimization / Image Optimization",
      "Internal Link Building (Crosslinking)",
      "Content Creation, Optimization & Editing",
    ],
  },
  {
    id: "enterprise-seo",
    name: "Enterprise SEO",
    price: "60,000",
    features: [
      "Google My Business Optimization",
      "Local Link Building",
      "Keyword Research and Analysis",
      "Product Page Optimization",
      "Category Page Optimization",
      "Technical SEO Audit",
      "Site Architecture and Navigation",
      "Canonicalization and Pagination",
      "Schema Markup Implementation",
      "Image Optimization",
    ],
  },
] as const;

const tableOfContents = [
  "Top Rated SEO Company in Kenya",
  "An SEO Marketing Company in Kenya That Gets It",
  "SEO Services Kenya",
  "Looking for the best SEO agency in Kenya out there?",
  "Best SEO Company in Kenya Providing SEO Solutions to Solve Your Problems",
  "Website Content From SEO and digital marketing agency Mombasa Kenya",
  "Off-Page Optimization: Boosting Your Website’s Authority and Visibility",
  "On page SEO Services in Mombasa: Boosting Your Visibility and Rankings in Local Search Results",
  "SEO Services Prices and Packages in Kenya and Features on all Plans",
  "Basic SEO Plan",
  "Standard SEO Plan",
  "Enterprise SEO",
  "NOT SURE HOW TO START?",
  "Drop Us A Line",
  "Explore More Search Engine Optimization (SEO) Services",
  "Search Engine Optimization (SEO) FAQs",
  "Testimonials From Our Happy Clients",
];

const dropUsLineInputClass =
  "min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/25";

export default function SEOPage() {
  const route = "/services/seo";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  const [dropLineForm, setDropLineForm] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [dropLineSubmitted, setDropLineSubmitted] = useState(false);
  const [dropLineSubmitting, setDropLineSubmitting] = useState(false);
  const [dropLineError, setDropLineError] = useState<string | null>(null);

  const [checkoutPkg, setCheckoutPkg] = useState<{ id: string; title: string; amountKes: number } | null>(null);

  const handleDropLineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDropLineSubmitting(true);
    setDropLineError(null);

    const subject =
      dropLineForm.subject.trim() || "SEO services inquiry — Changer Fusions website";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dropLineForm.name,
          email: dropLineForm.email,
          phone: dropLineForm.phone,
          subject,
          message: dropLineForm.message,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message. Please try again.");
      }

      const whatsappMessage = `*SEO page inquiry*

*Name:* ${dropLineForm.name}
*Email:* ${dropLineForm.email}
*Phone:* ${dropLineForm.phone || "Not provided"}
*Subject:* ${subject}

*Message:*
${dropLineForm.message}`;

      const whatsappNumber = "254797777347";
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, "_blank");

      setDropLineSubmitted(true);
      setDropLineForm({ name: "", phone: "", email: "", subject: "", message: "" });
      setTimeout(() => setDropLineSubmitted(false), 8000);
    } catch (err: unknown) {
      setDropLineError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDropLineSubmitting(false);
    }
  };

  return loading && !page ? (
    <div className="pt-28 min-h-screen bg-gray-50" />
  ) : (
    <>
    <ServiceDetailTemplate
      activeHref={route}
      heroVariant="fullWidthImage"
      layout="fullWidth"
      title={isManaged ? page?.title ?? "" : "SEO Services"}
      heroLabel=""
      description={
        isManaged
          ? page?.description ?? ""
          : ""
      }
      introContent={
        <div className="min-w-0 overflow-x-clip">
          {/* Table of Contents — directly after hero */}
          <section className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-7 md:py-10">
              <div className="w-full rounded-xl border border-secondary-600/50 bg-white p-4 shadow-sm md:p-6">
                <div className="text-sm font-extrabold text-gray-900">Table of Contents</div>
                <nav aria-label="Sections on this page" className="mt-3">
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700 marker:text-secondary-600 sm:space-y-1.5">
                    {tableOfContents.map((item) => (
                      <li key={item} className="break-words pl-0.5">
                        {item}
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
          </section>

          {/* Search Console visual + copy + CTA — after table of contents */}
          <section
            id="seo-packages"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-14 lg:py-16">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center">
                <div className="relative order-2 lg:order-1">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-lg ring-1 ring-gray-900/5">
                    <Image
                      src={dashboardImageUrl}
                      alt="Google Search Console performance dashboard — SEO analytics example"
                      width={1200}
                      height={760}
                      className="h-auto w-full object-cover object-left-top"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>
                </div>

                <div className="order-1 space-y-5 text-left lg:order-2 lg:pl-2">
                  <h2 className="text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                    Top Rated SEO Company in Kenya
                  </h2>
                  <div className="space-y-4 text-gray-700 [&_p]:text-left [&_p]:leading-relaxed">
                    <p>
                      For any business to succeed in today&apos;s market, it first needs to be found by the consumer.
                      Standing out above the noise, effectively engaging your audience alongside competitors, and
                      enabling your value to shine through are all key benefits of a solid SEO strategy.
                    </p>
                    <p>
                      Search engine optimization in Kenya has become a demand and a common topic for many upcoming
                      businesses. Search Engine Optimization (SEO) is optimizing a website to rank higher in search
                      engine results (SERPs) and increase organic traffic to your website.{" "}
                      <span className="font-semibold text-primary-700">Changer Fusions</span> is your trusted SEO partner
                      in Kenya — offering practical SEO services and expert consultation for businesses of all sizes.
                    </p>
                    <p>
                      75% of consumers don&apos;t make it past the first page of the search results. If you&apos;re not
                      right there, you&apos;re probably losing sales. Ranking #1 or #2 for your keywords, products, and
                      services isn&apos;t luck — it takes professional SEO services from an experienced marketing
                      agency.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/services/seo#seo-packages"
                      className="btn-secondary inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide sm:w-auto"
                    >
                      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                      Check the packages
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ROI / trust copy — after Search Console section */}
          <section className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-8 md:py-10">
              <div className="w-full max-w-none space-y-5 text-left">
                <p className="text-left text-base leading-relaxed text-gray-700">
                  A carefully crafted SEO strategy can significantly increase your website traffic and improve sales.
                  Overall, search engine optimization offers one of the highest returns on investment of any marketing
                  strategy.
                </p>
                <p className="text-left text-base leading-relaxed text-gray-700">
                  <span className="font-semibold text-primary-700">Changer Fusions</span> is an award-winning SEO company
                  in Kenya and one of the companies offering SEO services in Kenya. Our skilled digital marketing team
                  helps clients grow their businesses through digital marketing strategies. We help businesses with online
                  presence to have a good website ranking in Kenya and beyond.
                </p>
              </div>
            </div>
          </section>

          {/* An SEO Marketing Company — text left, illustration right (full width) */}
          <section
            id="seo-marketing-kenya"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b-8 border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-14 lg:py-16">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
                <div className="order-1 space-y-6 text-left lg:col-span-7">
                  <h2 className="text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                    An SEO Marketing Company in Kenya That Gets It
                  </h2>
                  <div className="text-base leading-relaxed text-gray-700 [&_p]:text-left">
                    <p className="text-left">
                      <span className="font-semibold text-primary-700">Changer Fusions</span> is a full-service digital
                      marketing company in Kenya and a Mombasa SEO company. We help companies in Mombasa and all over the
                      world boost their income and organic traffic. Mombasa is a major hub on Kenya&apos;s coast and a
                      center of attraction for businesses that need a strong local and regional presence. Therefore, it has
                      become a competitive marketplace for everyone who needs to set up a business.
                      However, it is essential to have a proper SEO strategy to increase your online presence and beat the
                      competition to stand out from this pool of many businesses. Our Kenyan SEO experts have produced
                      outstanding results for many clients, from small businesses to large enterprises. Our SEO work in
                      Kenya has helped many businesses reach the top through top-notch strategies. Our SEO campaigns combine
                      targeted keywords, high-quality content, and premium link-building strategies. We ensure your site
                      shows up in search results when potential customers search for your services.{" "}
                      <Link href="/contact" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
                        Contact us
                      </Link>{" "}
                      today for details on how we can help you get good leads for your business.
                    </p>
                  </div>
                  <p className="text-left text-base font-bold text-gray-900">
                    Looking for the best SEO agency out there?
                  </p>
                </div>

                <div className="order-2 lg:col-span-5">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-md ring-1 ring-gray-900/5">
                    <Image
                      src={seoMarketingIllustrationUrl}
                      alt="SEO strategy illustration — analytics, optimization, and growth"
                      width={900}
                      height={700}
                      className="h-auto w-full object-contain object-center"
                      sizes="(max-width: 1024px) 100vw, 42vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEO Services Kenya — label, heading, intro + checklist (full width) */}
          <section
            id="seo-services-kenya"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-14 lg:py-16">
              <div className="w-full max-w-none space-y-6 text-left">
                <div className="text-xs font-extrabold tracking-[0.2em] text-secondary-600 uppercase">
                  SEO Services Kenya
                </div>
                <h2 className="!text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                  Looking For The Best SEO Agency In Kenya Out There?
                </h2>
                <div className="h-1.5 w-14 rounded-full bg-secondary-600" aria-hidden />
                <p className="text-base leading-relaxed text-gray-600">
                  Get more traffic and revenue from search with SEO services that blend talent and tech to improve SEO
                  performance while tracking its bottom-line impact. Connect with{" "}
                  <span className="font-semibold text-primary-700">Changer Fusions</span> today to get a custom proposal.
                  Increase visitors (and sales) with Mombasa&apos;s trusted SEO services built for your business. Those SEO
                  services in Mombasa include:
                </p>

                <div className="rounded-xl border border-gray-200 bg-[#f9f9f9] p-6 shadow-sm md:p-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-4">
                    <ul className="space-y-4">
                      {seoServicesKenyaFeatures.colA.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-gray-600">
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-4">
                      {seoServicesKenyaFeatures.colB.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-gray-600">
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Best SEO Company — heading + two paragraphs (full width, text only) */}
          <section
            id="best-seo-company-kenya-solutions"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-12">
              <div className="w-full max-w-none space-y-5 text-left">
                <h2 className="!text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                  Best SEO Company in Kenya Providing SEO Solutions to Solve Your Problems
                </h2>
                <p className="text-left text-base leading-relaxed text-gray-600">
                  If you are a local business trying to access a local marketplace, you will know it&apos;s hard work
                  getting your name out there and building a reputation. Our local SEO services can make all the
                  difference.
                </p>
                <p className="text-left text-base leading-relaxed text-gray-600">
                  85% of customers search for local businesses online. What&apos;s more, most of these searches are via a
                  mobile phone. Google now customizes its results to give the best results for local businesses — if that
                  business is optimized to appear in local search.
                </p>
              </div>
            </div>
          </section>

          {/* Website content — bordered card, heading + CTA left, body right */}
          <section
            id="website-content-mombasa-seo"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8 lg:p-10">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 lg:items-start">
                  <div className="space-y-6 text-left">
                    <h2 className="!text-left text-xl font-extrabold leading-tight tracking-tight text-gray-900 text-pretty break-words sm:text-2xl md:text-3xl lg:text-4xl">
                      Website Content From SEO and digital marketing agency Mombasa Kenya
                    </h2>
                    <div className="pt-1">
                      <Link
                        href="/services/seo#seo-packages"
                        className="btn-secondary inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide"
                      >
                        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                        Check the packages
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-5 text-left text-base leading-relaxed text-gray-600">
                    <p>
                      Website content is important because it helps attract potential customers to your web pages via
                      search engine optimization (SEO). Once they land on your site, the content helps people decide
                      whether to sign up for more information and become leads. If you have products for sale, the content
                      also helps them make buying decisions. Website content is also crucial in building an online presence
                      for your business. That&apos;s why it makes sense to partner with{" "}
                      <span className="font-semibold text-primary-700">Changer Fusions</span> for professional website
                      content and SEO-led messaging.
                    </p>
                    <p>
                      Defining your website&apos;s voice and tone helps you create on-brand content. Your website&apos;s
                      voice is like its personality. Think about how you might describe that in words such as
                      &quot;knowledgeable&quot; or &quot;professional.&quot; That gives an overall idea of how you want
                      your content to sound. The tone of your website&apos;s content may vary depending on the audience.
                      For example, some content might be aimed at beginners, while others might assume that the audience
                      is more informed. Optimize your website with our cost-effective SEO strategies today.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Off-page SEO — body + list left, heading + CTA right */}
          <section
            id="off-page-optimization"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8 lg:p-10">
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
                  <div className="space-y-5 text-left text-base leading-relaxed text-gray-600 lg:col-span-7">
                    <p>
                      Off-page SEO refers to SEO factors and strategies focused on promoting your site or brand around the
                      web.
                    </p>
                    <p>
                      Optimizing for off-site ranking factors involves improving search engine and user perception of a
                      site&apos;s popularity, relevance, trustworthiness, and authority.
                    </p>
                    <p>Some of the key elements of our off-page optimization process include:</p>
                    <ul className="list-disc space-y-3 pl-5 marker:text-gray-400">
                      <li>
                        <span className="font-semibold text-gray-700">Careful Link Building:</span> By hand, on diverse
                        domains with high domain authority.
                      </li>
                      <li>
                        Distribution of articles or content to multiple platforms or websites, including social media,
                        curated sites, and news outlets.
                      </li>
                      <li>Guest blogging</li>
                      <li>Linked and unlinked brand mentions.</li>
                      <li>Influencer marketing</li>
                      <li>Local SEO</li>
                    </ul>
                  </div>

                  <div className="space-y-6 text-left lg:col-span-5">
                    <h2 className="!text-left text-xl font-extrabold leading-tight tracking-tight text-gray-900 text-pretty break-words sm:text-2xl md:text-3xl lg:text-4xl">
                      Off-Page Optimization: Boosting Your Website&apos;s Authority and Visibility
                    </h2>
                    <div className="pt-1">
                      <Link
                        href="/services/seo#seo-packages"
                        className="btn-secondary inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide"
                      >
                        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                        Check the packages
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* On-page SEO — heading + CTA left (~40%), body right (~60%), light gray card */}
          <section
            id="on-page-seo-mombasa"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-12">
              <div className="rounded-2xl border border-gray-200 bg-[#f9f9f9] p-6 shadow-sm md:p-8 lg:p-10">
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
                  <div className="space-y-6 text-left lg:col-span-5">
                    <h2 className="!text-left text-xl font-extrabold leading-tight tracking-tight text-gray-900 text-pretty break-words sm:text-2xl md:text-3xl">
                      On page SEO Services in Mombasa: Boosting Your Visibility and Rankings in Local Search Results
                    </h2>
                    <div className="pt-1">
                      <Link
                        href="/services/seo#seo-packages"
                        className="btn-secondary inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide"
                      >
                        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                        Check the packages
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-5 text-left text-base leading-relaxed text-gray-600 lg:col-span-7">
                    <p>
                      On-page SEO is important because it helps search engines understand the content of your website and
                      determine how relevant it is to specific search queries. By optimizing your website&apos;s on-page
                      elements, you can increase its chances of ranking well in search results and attracting targeted
                      traffic.
                    </p>
                    <p>
                      Some best practices for on-page SEO include: — Optimizing the content of your website to include
                      relevant keywords and phrases but also ensuring that the content is valuable, informative, and
                      well-written. — Using descriptive, unique, and concise title tags and meta descriptions that
                      accurately reflect the content of each page. — Ensuring your website&apos;s URLs are easy to read and
                      include relevant keywords. — Using header tags (H1, H2, etc.) to break up the content of your pages
                      and make them easier to read. — Optimizing images by using descriptive, relevant file names and alt
                      text.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEO prices & packages — intro (white) + full-bleed gray pricing band */}
          <section
            id="seo-prices-packages-kenya"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 pt-10 pb-8 md:pt-12 md:pb-10">
              <div className="w-full max-w-none space-y-6 text-left">
                <div className="text-xs font-extrabold tracking-[0.2em] text-secondary-600 uppercase">
                  Featured packages
                </div>
                <h2 className="!text-left text-xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-2xl md:text-3xl lg:text-4xl">
                  SEO Services Prices And Packages In Kenya And Features On All Plans
                </h2>
                <div className="h-1.5 w-14 rounded-full bg-secondary-600" aria-hidden />
                <p className="text-left text-base leading-relaxed text-gray-600">
                  If you are ready to hire an SEO company in Kenya, or even just an SEO consultant to perform specific SEO
                  services, some SEO companies in Mombasa do offer one-time SEO projects. Most commonly, this comes in the
                  form of an SEO audit, but could simply perform optimizations on the website only once, without an
                  ongoing contract. Before we decide on an SEO strategy for your business, we do an SEO audit that
                  comprehensively examines a website&apos;s search engine optimization performance. The purpose of the
                  audit is to identify any issues that may be hindering your website&apos;s ability to rank high on search
                  engine results pages (SERPs). Once the audit is complete, you may decide to hire our SEO company.
                </p>
              </div>
            </div>

            <div className="w-full border-t border-gray-200 bg-gray-50">
              <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 md:py-14">
                <div className="mx-auto grid w-full max-w-none grid-cols-1 gap-6 md:grid-cols-3 md:gap-6 lg:gap-8 xl:gap-10">
                  {seoPackages.map((pkg) => {
                    const catalog = SEO_SERVICE_PACKAGES.find((p) => p.packageId === pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        id={pkg.id}
                        className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-7 lg:p-8"
                      >
                        <h3 className="!text-left text-lg font-extrabold text-gray-900 md:text-xl">{pkg.name}</h3>
                        <div className="mt-4 flex flex-wrap items-baseline gap-x-1 gap-y-1">
                          <span className="text-3xl font-extrabold tabular-nums text-secondary-600 md:text-4xl">
                            {pkg.price}
                          </span>
                          <span className="text-lg font-bold text-secondary-600 md:text-xl">Ksh</span>
                          <span className="ml-1 text-sm font-medium text-gray-500">/ Month</span>
                        </div>
                        <ul className="mt-6 flex flex-col divide-y divide-gray-100 border-t border-gray-200">
                          {pkg.features.map((line) => (
                            <li
                              key={line}
                              className="flex items-start gap-3 py-3.5 text-left text-sm leading-snug text-gray-800"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                        {catalog ? (
                          <div className="mt-8 border-t border-gray-100 pt-6">
                            <button
                              type="button"
                              onClick={() =>
                                setCheckoutPkg({
                                  id: catalog.packageId,
                                  title: catalog.title,
                                  amountKes: catalog.amountKes,
                                })
                              }
                              className="btn-secondary min-h-[44px] w-full touch-manipulation rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide"
                            >
                              Checkout &amp; invoice
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section
            id="explore-more-seo-services"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 py-10 sm:px-6 md:py-12 lg:px-10 xl:px-14 2xl:px-16">
              <h2 className="text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                Explore more search engine optimization (SEO) services
              </h2>
              <p className="mt-4 max-w-3xl text-left text-base leading-relaxed text-gray-600">
                SEO works best alongside a strong digital presence. Explore related services from our Mombasa team or get
                in touch for a tailored plan.
              </p>
              <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <li>
                  <Link
                    href="/services/digital-marketing"
                    className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-900 transition-colors hover:border-secondary-500/40 hover:bg-white"
                  >
                    Digital marketing in Kenya
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/website-development"
                    className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-900 transition-colors hover:border-secondary-500/40 hover:bg-white"
                  >
                    Website development &amp; SEO-friendly builds
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/social-media-marketing"
                    className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-900 transition-colors hover:border-secondary-500/40 hover:bg-white"
                  >
                    Social media marketing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border-2 border-secondary-600 bg-secondary-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-secondary-700"
                  >
                    Contact the SEO team
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          <section
            id="seo-faqs"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-gray-50"
          >
            <div className="w-full px-4 py-10 sm:px-6 md:py-14 lg:px-10 xl:px-14 2xl:px-16">
              <div className="mx-auto max-w-3xl text-left">
                <div className="text-xs font-extrabold tracking-[0.2em] text-secondary-600 uppercase">FAQ</div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                  Search engine optimization (SEO) FAQs
                </h2>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  Quick answers about timelines, packages, local SEO, and how we work with businesses in Kenya.
                </p>
              </div>
              <div className="mx-auto mt-8 max-w-3xl space-y-3">
                {SEO_SERVICE_FAQ_ITEMS.map((item) => (
                  <details
                    key={item.question}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm open:shadow-md [&[open]_summary_svg]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-left marker:hidden sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 text-base font-bold text-gray-900 text-pretty break-words">
                        {item.question}
                      </span>
                      <ChevronDown
                        className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600 transition-transform duration-200"
                        aria-hidden
                      />
                    </summary>
                    <div className="border-t border-gray-100 px-4 pb-4 text-left text-sm leading-relaxed text-gray-600 sm:px-5 sm:pb-5">
                      <p className="pt-3 text-pretty">{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section
            id="seo-testimonials"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-white"
          >
            <div className="w-full px-4 py-10 sm:px-6 md:py-12 lg:px-10 xl:px-14 2xl:px-16">
              <h2 className="text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                Testimonials from our happy clients
              </h2>
              <p className="mt-4 max-w-2xl text-left text-base leading-relaxed text-gray-600">
                Read feedback from businesses we&apos;ve supported across campaigns, websites, and growth projects.
              </p>
              <div className="mt-6">
                <Link
                  href="/testimonials"
                  className="btn-secondary inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide"
                >
                  View testimonials
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                </Link>
              </div>
            </div>
          </section>
        </div>
      }
      afterFeaturesContent={
        <div className="min-w-0">
          <section
            id="not-sure-how-to-start"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-y border-secondary-700/25 bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700"
          >
            <div className="w-full px-4 py-12 sm:px-6 md:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-16">
              <div className="w-full max-w-none text-left">
                <h2 className="!text-left text-balance text-xl font-extrabold uppercase tracking-wide text-white sm:text-2xl md:text-3xl">
                  NOT SURE HOW TO START?
                </h2>
                <p className="mt-6 max-w-none text-left text-base leading-relaxed text-white/95 md:text-lg">
                  Partner with us today and experience the difference our expertise can make. Whether you&apos;re searching
                  for <strong className="font-bold text-white">affordable SEO services for small businesses</strong>, a
                  reliable <strong className="font-bold text-white">Best SEO consultant</strong>, or the{" "}
                  <strong className="font-bold text-white">best SEO company for small businesses</strong>,{" "}
                  <span className="font-semibold text-white">Changer Fusions</span> is your trusted partner for success.
                  Let&apos;s take your online presence to the next level!
                </p>
                <div className="mt-8 flex justify-start">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border-2 border-white bg-white/0 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-8"
                  >
                    <Phone className="h-5 w-5 shrink-0" aria-hidden />
                    CONTACT US
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section
            id="drop-us-a-line"
            className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] border-b border-gray-200 bg-gray-50"
          >
            <div className="w-full px-4 py-12 sm:px-6 md:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-16">
              <div className="w-full max-w-none text-left">
                <div className="text-xs font-extrabold tracking-[0.2em] text-secondary-600 uppercase">Send message</div>
                <h2 className="!mt-4 !text-left text-2xl font-extrabold tracking-tight text-gray-900 text-pretty break-words sm:text-3xl md:text-4xl">
                  Drop Us A Line
                </h2>
                <div className="mt-4 h-1.5 w-14 rounded-full bg-secondary-600" aria-hidden />
                <p className="mt-5 max-w-none text-left text-base leading-relaxed text-gray-600">
                  Kindly fill in the information and we will get back to you as soon as we can.
                </p>

                {dropLineSubmitted ? (
                  <div className="mt-10 rounded-xl border border-secondary-200 bg-white p-8 shadow-sm">
                    <CheckCircle className="h-14 w-14 text-secondary-600" aria-hidden />
                    <h3 className="mt-4 text-xl font-extrabold text-gray-900">Message sent</h3>
                    <p className="mt-2 text-left text-gray-600">
                      We&apos;ve received your inquiry. A WhatsApp chat may open so you can continue the conversation with
                      our team.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleDropLineSubmit} className="mt-10 w-full max-w-none space-y-5 md:space-y-6">
                    {dropLineError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dropLineError}</div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                      <div>
                        <label htmlFor="seo-drop-name" className="sr-only">
                          Your Name (required)
                        </label>
                        <input
                          id="seo-drop-name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="Your Name*"
                          value={dropLineForm.name}
                          onChange={(e) => setDropLineForm({ ...dropLineForm, name: e.target.value })}
                          className={dropUsLineInputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="seo-drop-phone" className="sr-only">
                          Your Phone (required)
                        </label>
                        <input
                          id="seo-drop-phone"
                          name="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          placeholder="Your Phone*"
                          value={dropLineForm.phone}
                          onChange={(e) => setDropLineForm({ ...dropLineForm, phone: e.target.value })}
                          className={dropUsLineInputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                      <div>
                        <label htmlFor="seo-drop-email" className="sr-only">
                          Your Email (required)
                        </label>
                        <input
                          id="seo-drop-email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="Your Email*"
                          value={dropLineForm.email}
                          onChange={(e) => setDropLineForm({ ...dropLineForm, email: e.target.value })}
                          className={dropUsLineInputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="seo-drop-subject" className="sr-only">
                          Subject
                        </label>
                        <input
                          id="seo-drop-subject"
                          name="subject"
                          type="text"
                          autoComplete="off"
                          placeholder="Subject"
                          value={dropLineForm.subject}
                          onChange={(e) => setDropLineForm({ ...dropLineForm, subject: e.target.value })}
                          className={dropUsLineInputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="seo-drop-message" className="sr-only">
                        Message (required)
                      </label>
                      <textarea
                        id="seo-drop-message"
                        name="message"
                        required
                        rows={6}
                        placeholder="Leave Us A Short Message"
                        value={dropLineForm.message}
                        onChange={(e) => setDropLineForm({ ...dropLineForm, message: e.target.value })}
                        className={`${dropUsLineInputClass} min-h-[140px] resize-y`}
                      />
                    </div>
                    <div className="flex justify-start pt-1">
                      <button
                        type="submit"
                        disabled={dropLineSubmitting}
                        className="btn-secondary inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-5 w-5 shrink-0" aria-hidden />
                        {dropLineSubmitting ? "Sending…" : "Send message"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      }
      featuresTitle=""
      features={[]}
      benefitsTitle=""
      benefits={[]}
      ctaTitle=""
      ctaDescription=""
      backgroundImageUrl={
        isManaged ? (page?.background_image_url ?? undefined) ?? undefined : heroImageUrl
      }
      icon={Search}
    />
    <SeoPackageCheckoutModal
      open={checkoutPkg !== null}
      onClose={() => setCheckoutPkg(null)}
      packageId={checkoutPkg?.id ?? ""}
      packageTitle={checkoutPkg?.title ?? ""}
      amountKes={checkoutPkg?.amountKes ?? 0}
    />
    </>
  );
}

