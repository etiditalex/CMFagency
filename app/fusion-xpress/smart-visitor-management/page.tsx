import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FolderInput,
  HeartPulse,
  Home,
  IdCard,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  Lock,
  MapPin,
  Monitor,
  Palmtree,
  QrCode,
  Shield,
  Trophy,
  UtensilsCrossed,
  UserCheck,
  Users,
} from "lucide-react";

const HERO_BANNER =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778921950/banner_1_trzov5.jpg";

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

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Visitor pre-registration",
    description: "Guests register before arrival so reception and security are prepared.",
  },
  {
    icon: QrCode,
    title: "QR code visitor passes",
    description: "Approved visitors receive a digital pass they can show at the gate or front desk.",
  },
  {
    icon: UserCheck,
    title: "Host approval workflow",
    description: "Hosts approve or decline visits before guests are issued access credentials.",
  },
  {
    icon: Shield,
    title: "Security / reception check-in",
    description: "Staff scan or verify passes and record who entered the premises.",
  },
  {
    icon: LogIn,
    title: "Entry and exit logs",
    description: "Complete audit trail of check-ins and check-outs for compliance and safety.",
  },
  {
    icon: Bell,
    title: "Real-time host notifications",
    description: "Hosts are alerted when their visitor arrives or needs attention.",
  },
  {
    icon: BarChart3,
    title: "Visitor analytics dashboard",
    description: "Trends, peak hours, and visit volumes in one Fusion Xpress module.",
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
      <section className="relative mt-20 w-full overflow-hidden md:mt-24">
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
          <div className="grid min-h-[min(88vh,720px)] grid-cols-1 items-center gap-10 py-14 md:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
            <div className="max-w-xl text-white lg:pr-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-200 sm:text-sm">
                Fusion Xpress · Smart Visitor Management
              </p>
              <h1 className="mt-4 text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl md:text-[2.65rem] lg:text-5xl">
                QR Code Visitor Management System.
                <span className="block mt-1 text-white/95">Easy to use and secure.</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-white/90 sm:text-lg md:max-w-lg">
                Digitize guest check-ins, visitor passes, and access control for offices, estates,
                schools, hospitals, and corporate spaces. Replace manual visitor books with a smart
                QR-based system—get started in minutes, no extra hardware required.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/contact?subject=Smart%20Visitor%20Management%20Demo"
                  className="inline-flex items-center justify-center rounded-full bg-secondary-400 px-8 py-3.5 text-sm font-bold text-primary-950 shadow-lg shadow-black/15 transition-colors hover:bg-secondary-300 sm:text-base"
                >
                  Request Demo
                </Link>
                <Link
                  href="/fusion-xpress/admin-login"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/90 bg-transparent px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:text-base"
                >
                  Add Visitor Module
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:mx-0">
              <div className="relative aspect-[4/3] w-full">
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
      <section className="w-full bg-white py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              How Fusion Xpress Visitor Management Works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              A simple four-step flow from arrival to records—built for reception, security, and hosts.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:mt-16 lg:grid-cols-4 lg:gap-6 xl:gap-8">
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

      <section className="w-full border-t border-gray-100 bg-gray-50/80 py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
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
                  className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm transition-shadow hover:shadow-md"
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

      <section className="w-full border-t border-gray-100 bg-gray-50 py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
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
                  className="flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white px-6 py-10 text-center shadow-sm transition-shadow hover:shadow-md"
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
                    Demo Form
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              From events to everyday access
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              You already trust Fusion Xpress for ticketing, voting, and campaign operations. Smart
              Visitor Management brings the same reliability to front-desk workflows—pre-registration,
              host approvals, QR passes, and real-time logs—without paper sign-in sheets.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Works for single sites or multi-building estates",
                "Role-based dashboard for admins, reception, and hosts",
                "Designed to connect to your backend when you go live",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary-800">Built for</p>
                <p className="text-lg font-extrabold text-gray-900">Modern workplaces</p>
              </div>
            </div>
            <p className="mt-5 text-sm text-gray-600 leading-relaxed">
              Whether you manage a corporate HQ, residential estate, school campus, or clinic reception,
              give every guest a consistent, professional check-in experience.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center">
            Everything you need in one module
          </h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            A complete visitor lifecycle—from booking to checkout—with analytics your team can act on.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-700" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-primary-200 bg-gradient-to-r from-primary-50 via-white to-secondary-50 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            Ready to modernize your front desk?
          </h2>
          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Enable the Visitor Management module in your Fusion Xpress dashboard or talk to our team
            for a guided demo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?subject=Smart%20Visitor%20Management%20Demo" className="btn-primary">
              Request Demo
            </Link>
            <Link href="/fusion-xpress/admin-login" className="btn-outline">
              Sign in to Fusion Xpress
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
