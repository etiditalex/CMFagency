import Link from "next/link";
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin, House, Award, Crown, Shield } from "lucide-react";
import Image from "next/image";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

/** Kenya country outline (lon/lat projected into a portrait viewBox). Decorative only. */
const KENYA_PATH =
  "M69.77,62.00 L75.42,69.78 L68.74,73.54 L66.38,77.48 L62.80,78.17 L61.45,84.81 L58.38,88.61 L56.52,94.89 L52.68,98.00 L38.97,88.58 L38.32,83.11 L3.71,63.90 L2.10,62.87 L2.00,52.87 L4.73,49.05 L9.43,42.81 L12.91,35.94 L8.71,25.12 L7.59,20.39 L3.06,13.84 L8.94,8.21 L15.41,2.00 L20.37,3.58 L20.37,8.87 L23.63,11.98 L30.27,11.98 L42.35,19.98 L45.37,20.08 L47.61,19.82 L49.72,20.90 L56.09,21.65 L58.91,17.72 L67.63,13.77 L71.48,16.96 L78.00,16.96 L69.66,27.66 L69.77,62.00 Z";

function FooterKenyaDotMap() {
  return (
    <div
      className="pointer-events-none absolute -inset-[38%] z-0"
      aria-hidden
    >
      <svg
        viewBox="0 0 80 100"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        focusable="false"
      >
        <defs>
          <pattern
            id="footer-kenya-dots"
            width="1.9"
            height="1.9"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0.95" cy="0.95" r="0.52" fill="#cbd5e1" />
          </pattern>
        </defs>
        <path d={KENYA_PATH} fill="url(#footer-kenya-dots)" opacity="0.38" />
      </svg>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerActionLinks = [
    { href: "/", label: "Home", icon: House },
    { href: "/kcm", label: "Certification", icon: Award },
    { href: "/kcm/member-portal", label: "KCM Member", icon: Crown },
    { href: "/fusion-xpress", label: "Fusion Xpress", icon: Shield },
  ];

  const quickLinks = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/portfolios", label: "Portfolios" },
    { href: "/jobs", label: "Job Board" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/fusion-xpress/fx-qr-code-generator", label: "Free QR Code Generator" },
    { href: "/research", label: "Research" },
    { href: "/merchandise", label: "Merchandise" },
  ];

  const services = [
    { name: "Digital Marketing", href: "/services/digital-marketing" },
    { name: "Social Media Marketing", href: "/services/social-media-marketing" },
    { name: "Website Development & Design", href: "/services/website-development" },
    { name: "Branding & Creative Services", href: "/services/branding" },
    { name: "Market Research & Analysis", href: "/services/market-research" },
    { name: "Events Marketing", href: "/services/events-marketing" },
    { name: "Content Creation", href: "/services/content-creation" },
  ];

  return (
    <footer className="relative bg-gray-900 text-gray-300">
      <div className="relative overflow-hidden">
      <div className="container-custom section-padding max-md:!pb-[calc(var(--site-mobile-dock-height)+1.75rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative w-10 h-10">
                <Image
                  src={BRAND_LOGO_URL}
                  alt="Changer Fusions Logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">Changer Fusions</span>
            </div>
            <p className="mb-4 text-sm font-semibold leading-snug text-primary-300">
              Market to thrive, Market to exist
            </p>
            <p className="mb-4 text-left text-sm leading-relaxed text-gray-300">
              A forward-thinking marketing strategic partner specializing in blending innovative marketing techniques, cutting-edge technologies, and transformative strategies to create impactful solutions.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@cmfagency.co.ke</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+254 797 777347</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-1" />
                <span>Ambalal Building, Nkruma Road, Ambalal, Mombasa, Kenya</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="relative z-10">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-primary-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="relative z-10">
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.href}>
                  <Link
                    href={service.href}
                    className="text-sm hover:text-primary-400 transition-colors duration-200"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Newsletter */}
          <div className="relative overflow-visible">
            <FooterKenyaDotMap />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(17,24,39,0.9) 0%, rgba(17,24,39,0.62) 48%, rgba(17,24,39,0.2) 76%, transparent 100%)",
              }}
            />
            <div className="relative z-10 drop-shadow-[0_1px_10px_rgba(17,24,39,0.95)]">
            <h3 className="text-white font-semibold mb-4">Stay Connected</h3>
            <p className="text-sm mb-4">
              Subscribe to our newsletter for the latest updates and event announcements.
            </p>
            
            {/* Social Media Icons */}
            <div className="mb-6">
              <p className="text-sm mb-3 text-gray-400">Follow us on social media</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/changerfusions?igsh=bzk0dWM0ZzJsbGxt&utm_source=ig_contact_invite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 group"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5 text-gray-300 group-hover:text-white" />
                </a>
                <a
                  href="https://www.facebook.com/share/187Kse9GrQ/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 group"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="w-5 h-5 text-gray-300 group-hover:text-white" />
                </a>
                <a
                  href="https://www.linkedin.com/in/changer-fusions-2262a53a3?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 group"
                  aria-label="Follow us on LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-gray-300 group-hover:text-white" />
                </a>
                <a
                  href="https://x.com/ChangerFusions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 group"
                  aria-label="Follow us on X"
                >
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            <NewsletterSubscribeForm variant="footer" />
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-300">
                &copy; {currentYear} Changer Fusions. All rights reserved.
              </p>
              <p className="mt-2 text-xs text-gray-300">Built by Changer Fusions</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/privacy" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                Privacy Policy
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/terms" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                Terms & Conditions
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/cookies" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Short dock (~52px + safe area). Keep in sync with CookieBanner mobile bottom offset. */}
      <div className="fixed inset-x-0 bottom-0 z-[60] pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <div className="mx-0 rounded-none border-t border-gray-200 bg-white px-1.5 py-1 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-4 gap-0.5">
            {footerActionLinks.map((item) => {
              const Icon = item.icon;
              const mobileLabel =
                item.label === "Certification"
                  ? "Cert"
                  : item.label === "KCM Member"
                    ? "KCM"
                    : item.label === "Fusion Xpress"
                      ? "FX"
                      : item.label;
              return (
                <Link
                  key={`mobile-${item.href}-${item.label}`}
                  href={item.href}
                  className="group flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 text-center transition-colors duration-200 active:bg-gray-50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-700 group-hover:text-primary-700 group-active:text-primary-800" />
                  <span className="whitespace-nowrap text-[10px] font-semibold leading-tight text-gray-800 group-hover:text-primary-800">
                    {mobileLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}


