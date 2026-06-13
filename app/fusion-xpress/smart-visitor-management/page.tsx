import Image from "next/image";
import Link from "next/link";

import VisitorPricingSection from "@/components/fusion-xpress/visitor-management/VisitorPricingSection";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Download,
  FileText,
  FolderInput,
  HeartPulse,
  Home,
  IdCard,
  KeyRound,
  Link2,
  LogOut,
  Lock,
  MapPin,
  Monitor,
  Palmtree,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";

const HERO_BANNER =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778990421/banner_2_la4bzj.jpg";

const CHECKIN_SHOWCASE_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778990811/call_to_action_vhh84w.jpg";

const ANALYTICS_SHOWCASE_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778991196/checkin_f3o8f5.jpg";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Display & Scan",
    description:
      "Display the QR code at reception or the gate and ask visitors to scan when they arrive.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922802/Display_Scan_yt9aeb.jpg",
    alt: "Visitor scanning a QR code on a tablet at check-in",
  },
  {
    step: "02",
    title: "Complete Details",
    description:
      "Visitors enter their contact information on mobile—we store it securely for your team.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922802/Complete_Details_hswwzi.jpg",
    alt: "Visitor completing a digital registration form on a phone",
  },
  {
    step: "03",
    title: "Easy Check Out",
    description:
      "Guests check out from the venue with a single tap when their visit is complete.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922801/Easy_Checkout_asktaa.jpg",
    alt: "Visitor checking out using the mobile app",
  },
  {
    step: "04",
    title: "Paperless Records",
    description:
      "Check-in data updates in real time in your Fusion Xpress dashboard and can be exported anytime.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778922801/Paperless_Records_doq9nh.jpg",
    alt: "Real-time visitor records and analytics on mobile",
  },
] as const;

const KEY_FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  iconWrap: string;
}[] = [
  {
    icon: MapPin,
    title: "Multiple Locations",
    description:
      "Unlimited locations, free of charge. Great for businesses with multiple branches, estates, or reception desks.",
    href: "/contact?subject=Visitor%20Management%20-%20Multiple%20Locations",
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: ClipboardList,
    title: "Customisable Form",
    description:
      "Collect the visitor details you need—ID, vehicle plate, host, purpose—and adapt fields per site or department.",
    href: "/contact?subject=Visitor%20Management%20-%20Custom%20Forms",
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    icon: Monitor,
    title: "Welcome Kiosk",
    description:
      "Turn any tablet into a self-service check-in kiosk with QR display, check-in, and check-out on one screen.",
    href: "/contact?subject=Visitor%20Management%20-%20Welcome%20Kiosk",
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
  {
    icon: IdCard,
    title: "Visitor ID Badges",
    description:
      "Generate printable or digital QR badges so guests and contractors are easy to identify on site.",
    href: "/contact?subject=Visitor%20Management%20-%20Visitor%20Badges",
    iconWrap: "bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200",
  },
  {
    icon: FolderInput,
    title: "Records Entry",
    description:
      "Manually enter check-in records from other sources. Keep all visitor records in one place.",
    href: "/contact?subject=Visitor%20Management%20-%20Records%20Entry",
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: LogOut,
    title: "Auto Check Out",
    description:
      "Visitors can tap to check out on their own, or set automatic check-out rules for your site.",
    href: "/contact?subject=Visitor%20Management%20-%20Auto%20Check%20Out",
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    icon: Download,
    title: "Records Download",
    description:
      "View and download visitor records 24/7. PDF and CSV export supported from your dashboard.",
    href: "/contact?subject=Visitor%20Management%20-%20Records%20Download",
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
  {
    icon: FileText,
    title: "SmartDocs",
    description:
      "Collect documents from visitors and capture key data from uploads for faster processing.",
    href: "/contact?subject=Visitor%20Management%20-%20SmartDocs",
    iconWrap: "bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200",
  },
  {
    icon: Link2,
    title: "CTA Button",
    description:
      "Display a call-to-action button that links to a file or URL for guests to open during check-in.",
    href: "/contact?subject=Visitor%20Management%20-%20CTA%20Button",
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: BarChart3,
    title: "Data Analytics",
    description:
      "Check-in history and visitor ratings help you track footfall, peak times, and satisfaction.",
    href: "/contact?subject=Visitor%20Management%20-%20Data%20Analytics",
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    icon: Lock,
    title: "Data Protection",
    description:
      "Visitor data is encrypted to high security standards with secure key management and access controls.",
    href: "/contact?subject=Visitor%20Management%20-%20Data%20Protection",
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
  {
    icon: KeyRound,
    title: "MFA",
    description:
      "Multi-factor authentication adds extra verification to the login process and strengthens admin security.",
    href: "/contact?subject=Visitor%20Management%20-%20MFA",
    iconWrap: "bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200",
  },
];

const DEMO_BASE = "/fusion-xpress/smart-visitor-management/demo";

const INDUSTRY_USE_CASES: {
  icon: LucideIcon;
  title: string;
  href: string;
  iconWrap: string;
}[] = [
  {
    icon: UtensilsCrossed,
    title: "Retail & Hospitality",
    href: `${DEMO_BASE}/retail-hospitality`,
    iconWrap: "bg-violet-100 text-violet-700",
  },
  {
    icon: HeartPulse,
    title: "Health & Aged Care",
    href: `${DEMO_BASE}/health-aged-care`,
    iconWrap: "bg-red-100 text-red-700",
  },
  {
    icon: Home,
    title: "Real Estate",
    href: `${DEMO_BASE}/real-estate`,
    iconWrap: "bg-orange-100 text-orange-700",
  },
  {
    icon: Building2,
    title: "Office & Education",
    href: `${DEMO_BASE}/office-education`,
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: Trophy,
    title: "Sports",
    href: `${DEMO_BASE}/sports`,
    iconWrap: "bg-sky-100 text-sky-700",
  },
  {
    icon: Palmtree,
    title: "Tourism",
    href: `${DEMO_BASE}/tourism`,
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
];

export const metadata = {
  title: "Smart Visitor Management | Fusion Xpress",
  description:
    "Digitize guest check-ins, visitor passes, and access control with Fusion Xpress Smart Visitor Management.",
};

export default function SmartVisitorManagementPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Full-width hero — reference-style two-column layout */}
      <section className="smart-visitor-hero relative mt-16 w-full overflow-hidden sm:mt-20 md:mt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, rgba(15,47,100,0.55) 0%, rgba(15,47,100,0.2) 42%, transparent 68%)",
          }}
        />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-400/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-secondary-400/20 blur-3xl pointer-events-none" />

        <div className="relative container-custom">
          <div className="grid min-h-0 grid-cols-1 items-center gap-6 py-8 sm:gap-10 sm:py-14 md:min-h-[min(80vh,720px)] md:gap-10 md:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
            <div className="order-2 w-full max-w-xl justify-self-start text-left text-white lg:order-1 lg:pr-4">
              <p className="!text-left text-[0.7rem] font-bold uppercase tracking-[0.12em] text-secondary-200 sm:text-xs sm:tracking-[0.2em]">
                Fusion Xpress · Smart Visitor Management
              </p>
              <h1 className="!text-left mt-3 text-2xl font-extrabold leading-[1.15] tracking-tight sm:mt-4 sm:text-4xl md:text-[2.65rem] lg:text-5xl">
                QR Code Employee and Visitor Management System.
                <span className="block mt-1 text-left text-white/95">Easy to use and secure.</span>
              </h1>
              <p className="!text-left mt-4 text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base md:text-lg md:max-w-lg">
                Digitize employee check-in / check-out, guest check-ins, visitor passes, and access control for
                offices, estates, schools, hospitals, and corporate spaces. Replace manual logbooks with a smart
                QR-based system—get started in minutes, no extra hardware required.
              </p>
              <div className="mt-6 flex flex-row flex-nowrap items-center justify-start gap-3 sm:mt-8">
                <Link
                  href="/fusion-xpress/smart-visitor-management/sign-up"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-secondary-400 px-5 py-3 text-sm font-bold text-primary-950 shadow-lg shadow-black/15 transition-colors hover:bg-secondary-300 active:scale-[0.99] sm:flex-none sm:px-8 sm:py-3.5 sm:text-base"
                >
                  Sign Up
                </Link>
                <Link
                  href="/fusion-xpress/smart-visitor-management/sign-in"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border-2 border-white/90 bg-transparent px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99] sm:flex-none sm:px-8 sm:py-3.5 sm:text-base"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div className="order-1 relative mx-auto w-full max-w-md sm:max-w-xl lg:order-2 lg:max-w-none lg:mx-0">
              <div className="relative aspect-[4/3] w-full lg:aspect-[5/4]">
                <Image
                  src={HERO_BANNER}
                  alt="Fusion Xpress visitor management — dashboard, kiosk check-in, mobile passes, and QR badges"
                  fill
                  priority
                  className="object-contain object-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — full width */}
      <section className="w-full bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              How Fusion Xpress Visitor Management Works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              A simple four-step flow from arrival to records—built for reception, security, and hosts.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-8 lg:mt-16 lg:grid-cols-4 lg:gap-6 xl:gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-md ${
                    index % 2 === 0 ? "bg-primary-600" : "bg-secondary-600"
                  }`}
                >
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900 md:text-xl">{item.title}</h3>
                <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-gray-600 md:text-[0.9375rem]">
                  {item.description}
                </p>
                <div className="mt-8 w-full max-w-[260px] rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,47,100,0.08)] sm:max-w-none">
                  <div className="relative mx-auto aspect-square w-full max-w-[220px]">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-contain object-center"
                      sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 25vw"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-100 bg-gray-50/80 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              Key Features
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              Everything you need to manage visitors efficiently and securely.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-5 xl:gap-6">
            {KEY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm transition-shadow hover:shadow-md sm:px-6 sm:py-8"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.iconWrap}`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                    {feature.description}
                  </p>
                  <Link
                    href={feature.href}
                    className="mt-6 text-sm font-bold text-primary-600 transition-colors hover:text-secondary-700"
                  >
                    Read More
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-100 bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              Built for your industry
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              See how Smart Visitor Management fits reception workflows across sectors.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-6">
            {INDUSTRY_USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white px-5 py-8 text-center shadow-sm transition-shadow hover:shadow-md sm:px-6 sm:py-10"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconWrap}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">{item.title}</h3>
                  <Link
                    href={item.href}
                    className="mt-5 text-sm font-bold text-secondary-600 transition-colors hover:text-primary-700"
                  >
                    Preview demo
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Swift check-in showcase — full width */}
      <section className="w-full border-t border-gray-100 bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-[0_24px_60px_rgba(15,47,100,0.1)] sm:aspect-[4/5]">
                  <Image
                    src={CHECKIN_SHOWCASE_IMAGE}
                    alt="Visitor welcome kiosk — digital check-in form with name, contact, email, and signature"
                    fill
                    className="object-contain object-center p-4 sm:p-6"
                    sizes="(max-width: 1024px) 90vw, 45vw"
                  />
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col justify-center text-left lg:pl-4 xl:pl-8">
              <div className="mx-auto w-full max-w-lg lg:mx-0">
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl md:text-[2.65rem] md:leading-[1.12]">
                  Check-in your visitors swiftly and safely
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
                  A fully customisable system that suits a wide range of business needs.
                </p>
                <h3 className="mt-10 text-2xl font-bold leading-snug text-gray-900 sm:text-[1.65rem]">
                  Register, Display, and Go
                </h3>
                <p className="mt-2 max-w-md text-base leading-relaxed text-gray-600">
                  Register your business now and get check-in QR codes ready to use in 3 minutes!
                </p>
                <Link
                  href="/fusion-xpress/smart-visitor-management/sign-up"
                  className="mt-10 inline-flex min-h-[48px] items-center justify-center self-start rounded-full bg-secondary-400 px-10 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-secondary-500"
                >
                  Sign Up Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics & security — text left, check-in confirmation right */}
      <section className="w-full border-t border-gray-100 bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="max-w-xl lg:max-w-none">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl lg:text-[2.5rem] lg:leading-tight">
                Powerful analytics at your fingertips
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600 md:text-lg">
                Real-time visitor records, check-in history, and customer ratings help you track
                customer flow and satisfaction levels. Download reports in PDF or CSV format anytime.
              </p>
              <Link
                href="/privacy"
                className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-secondary-500 bg-transparent px-8 py-3 text-sm font-bold text-secondary-700 transition-colors hover:bg-secondary-50 sm:text-base"
              >
                Learn About Security
              </Link>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-[0_24px_60px_rgba(15,47,100,0.1)]">
                  <Image
                    src={ANALYTICS_SHOWCASE_IMAGE}
                    alt="Visitor check-in confirmation on mobile — reception time, menu options, and check out"
                    fill
                    className="object-contain object-center p-3 sm:p-4"
                    sizes="(max-width: 1024px) 85vw, 22rem"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VisitorPricingSection />

      {/* Final CTA — full width */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-secondary-400 via-secondary-500 to-secondary-600"
          aria-hidden
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" aria-hidden />
        <div className="relative w-full px-4 py-14 text-center sm:px-6 sm:py-16 md:py-20 lg:px-10 xl:px-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl md:leading-tight">
              Ready to modernise your visitor management?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/95 sm:mt-5 sm:text-lg">
              Join organisations already using Fusion Xpress Smart Visitor Management. Set up takes
              less than 3 minutes — no hardware or IT support required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/fusion-xpress/smart-visitor-management/sign-up"
                className="inline-flex min-h-[48px] w-full min-w-[200px] items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-secondary-700 shadow-lg transition-colors hover:bg-white/95 sm:w-auto"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact?subject=Smart%20Visitor%20Management%20Demo"
                className="inline-flex min-h-[48px] w-full min-w-[200px] items-center justify-center rounded-full border-2 border-white bg-transparent px-8 py-3 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Try a Live Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

