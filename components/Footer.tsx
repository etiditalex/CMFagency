import Link from "next/link";
import { Calendar, Image as ImageIcon, Briefcase, Mail, Phone, MapPin } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/portfolios", label: "Portfolios" },
    { href: "/jobs", label: "Job Board" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
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
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765365917/cmfagency_logo_h1skcp.jpg"
                  alt="Changer Fusions Enterprise Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">Changer Fusions Enterprise</span>
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
                <span>AMBALAL BULDING, NKRUMA ROAD, MOMBASA MOMBASA DISTRICT MOMBASA P.O BOX 281, 40305 - MBITA</span>
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
            <form className="space-y-2">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                className="w-full btn-primary text-sm"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
          <p>&copy; {currentYear} Changer Fusions Enterprise (CMF). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}


