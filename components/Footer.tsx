import Link from "next/link";
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin, House, UserPlus, Award, Crown, Shield } from "lucide-react";
import Image from "next/image";
import AdSenseBlock from "@/components/AdSenseBlock";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerActionLinks = [
    { href: "/", label: "Home", icon: House },
    { href: "/events/register-as-model", label: "Register as Model", icon: UserPlus },
    { href: "/events/register-as-model", label: "Certification", icon: Award },
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
    { href: "/research", label: "Research" },
    { href: "/merchandise", label: "Merchandise" },
  ];

  const services = [
    { name: "Digital Marketing", href: "/services/digital-marketing" },
    { name: "Website Development & Design", href: "/services/website-development" },
    { name: "Branding & Creative Services", href: "/services/branding" },
    { name: "Market Research & Analysis", href: "/services/market-research" },
    { name: "Events Marketing", href: "/services/events-marketing" },
    { name: "Content Creation", href: "/services/content-creation" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
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
            <p className="text-sm mb-4 font-semibold text-primary-300 mb-2">
              Market to thrive, Market to exist
            </p>
            <p className="text-sm mb-4">
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
          <div>
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
          <div>
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
          <div>
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

        {/* Google AdSense - footer ad (only shows when NEXT_PUBLIC_ADSENSE_SLOT is set in Vercel) */}
        <div className="mt-10 pt-8 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-3 text-center">Advertisement</p>
          <AdSenseBlock />
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400">
                &copy; {currentYear} Changer Fusions. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-2">Built by Changer Fusions</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-primary-400 transition-colors duration-200">
                Privacy Policy
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/terms" className="text-gray-400 hover:text-primary-400 transition-colors duration-200">
                Terms & Conditions
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/cookies" className="text-gray-400 hover:text-primary-400 transition-colors duration-200">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 transform-gpu">
        {/* Mobile dock navigation */}
        <div className="mx-0 mb-0 rounded-none border-t border-primary-500/40 bg-gradient-to-r from-primary-900 via-primary-700 to-primary-800 px-2 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
          <div className="grid grid-cols-5 gap-1">
            {footerActionLinks.map((item) => {
              const Icon = item.icon;
              const mobileLabel =
                item.label === "Register as Model"
                  ? "Register"
                  : item.label === "Certification"
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
                  className="group flex h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-center transition-colors duration-200"
                >
                  <Icon className="h-5 w-5 shrink-0 text-white group-hover:text-white" />
                  <span className="text-[11px] leading-none font-semibold text-white group-hover:text-white whitespace-nowrap">
                    {mobileLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop sticky links */}
        <div className="hidden border-t border-primary-500/40 bg-gradient-to-r from-primary-900 via-primary-700 to-primary-800 md:block">
          <div className="container-custom py-4 md:py-5">
            <div className="grid grid-cols-5 gap-x-6">
              {footerActionLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`desktop-${item.href}-${item.label}`}
                    href={item.href}
                    className="group flex min-h-16 flex-col items-center justify-center gap-1.5 px-1 py-1 text-center transition-colors duration-200"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-white/80 group-hover:text-white" />
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div> 
      </div>
    </footer>
  );
}


