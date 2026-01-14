"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Calendar, ShoppingCart, User, Ticket, ChevronDown, LogOut, FileText, Instagram, Facebook, Linkedin, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [testimonialsOpen, setTestimonialsOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [careersOpen, setCareersOpen] = useState(false);
  const [careersSubmenuOpen, setCareersSubmenuOpen] = useState<string | null>(null);
  const [careersMobileOpen, setCareersMobileOpen] = useState(false);
  const [careersMobileSubmenuOpen, setCareersMobileSubmenuOpen] = useState<string | null>(null);
  const { getTotalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
  ];

  const aboutLinks = [
    { href: "/about", label: "About Us" },
    { href: "/about/team", label: "Our Team" },
    { href: "/about/partners", label: "Our Partners" },
  ];

  const testimonialsLinks = [
    { href: "/testimonials", label: "Testimonials" },
    { href: "/portfolios", label: "Gallery" },
    { href: "/blogs", label: "Blogs/News" },
  ];

  const servicesLinks = [
    { href: "/services", label: "All Services" },
    { href: "/services/digital-marketing", label: "Digital Marketing" },
    { href: "/services/website-development", label: "Website Development" },
    { href: "/services/branding", label: "Branding & Creative" },
    { href: "/services/market-research", label: "Market Research" },
    { href: "/services/events-marketing", label: "Events Marketing" },
    { href: "/services/content-creation", label: "Content Creation" },
  ];

  const eventsLinks = [
    { href: "/events", label: "All Events" },
    { href: "/events/upcoming", label: "Upcoming Events" },
    { href: "/events/past", label: "Past Events" },
  ];

  const careersLinks = {
    attachments: [
      { href: "/careers/attachments/marketing-opportunities", label: "Marketing Opportunities" },
      { href: "/careers/attachments/fashion-opportunities", label: "Fashion Opportunities" },
      { href: "/careers/attachments/events-opportunities", label: "Events Opportunities" },
      { href: "/careers/attachments/education-opportunities", label: "Education Opportunities" },
    ],
    internships: [
      { href: "/careers/internships/marketing-opportunities", label: "Marketing Opportunities" },
      { href: "/careers/internships/fashion-opportunities", label: "Fashion Opportunities" },
      { href: "/careers/internships/events-opportunities", label: "Events Opportunities" },
      { href: "/careers/internships/education-opportunities", label: "Education Opportunities" },
    ],
    jobs: [
      { href: "/careers/jobs/marketing-opportunities", label: "Marketing Opportunities" },
      { href: "/careers/jobs/fashion-opportunities", label: "Fashion Opportunities" },
      { href: "/careers/jobs/events-opportunities", label: "Events Opportunities" },
      { href: "/careers/jobs/education-opportunities", label: "Education Opportunities" },
    ],
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-lg backdrop-blur-md"
          : "bg-white/95 backdrop-blur-sm"
      }`}
    >
      {/* Top Bar - Running Text, Buttons, and Social Media Icons */}
      <div className="bg-primary-600 text-white overflow-hidden">
        <div className="container-custom">
          <div className="flex items-center justify-between h-10 md:h-12 gap-3 md:gap-4">
            {/* Running Text - Left Side */}
            <div className="hidden md:flex items-center flex-1 min-w-0 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap">
                <span className="text-xs md:text-sm font-medium mr-8">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs md:text-sm font-medium mr-8">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs md:text-sm font-medium mr-8">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs md:text-sm font-medium mr-8">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs md:text-sm font-medium mr-8">
                  Market to thrive, Market to exist
                </span>
              </div>
            </div>

            {/* Mobile Running Text */}
            <div className="md:hidden flex items-center flex-1 min-w-0 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap">
                <span className="text-xs font-medium mr-6">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs font-medium mr-6">
                  Market to thrive, Market to exist
                </span>
                <span className="text-xs font-medium mr-6">
                  Market to thrive, Market to exist
                </span>
              </div>
            </div>

            {/* Right Side - Buttons and Social Icons */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Track Application Button */}
              <Link
                href="/track-application"
                className="hidden md:flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 bg-white/20 hover:bg-white/30 rounded text-white text-xs md:text-sm font-semibold transition-colors"
              >
                <Search className="w-3 h-3 md:w-4 md:h-4" />
                <span>Track Application</span>
              </Link>

              {/* Login/User Button */}
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="hidden md:flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 bg-white/20 hover:bg-white/30 rounded text-white text-xs md:text-sm font-semibold transition-colors">
                    <User className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden lg:inline">{user?.name?.split(' ')[0] || "Account"}</span>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href="/application"
                      className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      My Application
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 bg-white/20 hover:bg-white/30 rounded text-white text-xs md:text-sm font-semibold transition-colors"
                >
                  <User className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden lg:inline">Login</span>
                </Link>
              )}

            {/* Social Media Icons */}
              <div className="flex items-center gap-1.5 md:gap-2">
              <a
                href="https://www.instagram.com/changerfusions?igsh=bzk0dWM0ZzJsbGxt&utm_source=ig_contact_invite"
                target="_blank"
                rel="noopener noreferrer"
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Follow us on Instagram"
              >
                  <Instagram className="w-3 h-3 md:w-3.5 md:h-3.5 text-white group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="https://www.facebook.com/share/187Kse9GrQ/"
                target="_blank"
                rel="noopener noreferrer"
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Follow us on Facebook"
              >
                  <Facebook className="w-3 h-3 md:w-3.5 md:h-3.5 text-white group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="https://www.linkedin.com/in/changer-fusions-2262a53a3?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noopener noreferrer"
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Follow us on LinkedIn"
              >
                  <Linkedin className="w-3 h-3 md:w-3.5 md:h-3.5 text-white group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="https://x.com/ChangerFusions"
                target="_blank"
                rel="noopener noreferrer"
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Follow us on X"
              >
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
              </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container-custom">
        <div className="flex items-center justify-between h-[80px] sm:h-[90px] md:h-[100px]">
          {/* Logo - Left */}
          <Link href="/" className="flex-shrink-0 h-full flex items-center">
            <div className="relative h-20 w-auto min-w-[160px] sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px]">
              <Image
                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"
                alt="Changer Fusions Logo"
                fill
                className="object-contain"
                priority
                fetchPriority="high"
                sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, (max-width: 1024px) 200px, 220px"
              />
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-bold text-gray-900 transition-colors duration-200 ${
                  link.href === "/"
                    ? "px-4 py-2 rounded-lg border border-gray-900 bg-white"
                    : "hover:text-primary-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* About Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setAboutOpen(true)}
              onMouseLeave={() => setAboutOpen(false)}
            >
              <Link
                href="/about"
                className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <span>About</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {aboutOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {aboutLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Services Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link
                href="/services"
                className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <span>Services</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {servicesLinks.map((service) => (
                      <Link
                        key={service.href}
                        href={service.href}
                        className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                      >
                        {service.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Why Changer Fusions */}
            <Link
              href="/marketing-fusion"
              className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200"
            >
              Why Changer Fusions
            </Link>

            {/* Careers Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setCareersOpen(true)}
              onMouseLeave={() => {
                setCareersOpen(false);
                setCareersSubmenuOpen(null);
              }}
            >
              <Link
                href="/careers"
                className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <span>Careers</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${careersOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {careersOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {/* Attachments */}
                    <div
                      className="relative"
                      onMouseEnter={() => setCareersSubmenuOpen('attachments')}
                      onMouseLeave={() => setCareersSubmenuOpen(null)}
                    >
                      <div className="px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium flex items-center justify-between cursor-pointer">
                        <span>Attachments</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${careersSubmenuOpen === 'attachments' ? 'rotate-180' : ''}`} />
                      </div>
                      {careersSubmenuOpen === 'attachments' && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute left-full top-0 ml-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        >
                          {careersLinks.attachments.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Internships */}
                    <div
                      className="relative"
                      onMouseEnter={() => setCareersSubmenuOpen('internships')}
                      onMouseLeave={() => setCareersSubmenuOpen(null)}
                    >
                      <div className="px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium flex items-center justify-between cursor-pointer">
                        <span>Internships</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${careersSubmenuOpen === 'internships' ? 'rotate-180' : ''}`} />
                      </div>
                      {careersSubmenuOpen === 'internships' && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute left-full top-0 ml-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        >
                          {careersLinks.internships.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Jobs */}
                    <div
                      className="relative"
                      onMouseEnter={() => setCareersSubmenuOpen('jobs')}
                      onMouseLeave={() => setCareersSubmenuOpen(null)}
                    >
                      <div className="px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium flex items-center justify-between cursor-pointer">
                        <span>Jobs</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${careersSubmenuOpen === 'jobs' ? 'rotate-180' : ''}`} />
                      </div>
                      {careersSubmenuOpen === 'jobs' && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute left-full top-0 ml-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        >
                          {careersLinks.jobs.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Testimonials Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setTestimonialsOpen(true)}
              onMouseLeave={() => setTestimonialsOpen(false)}
            >
              <Link
                href="/testimonials"
                className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <span>Testimonials</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${testimonialsOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {testimonialsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {testimonialsLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Link
              href="/cart"
              className="relative p-2 text-gray-900 hover:text-primary-600 transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute top-0 right-0 bg-secondary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Events Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setEventsOpen(true)}
              onMouseLeave={() => setEventsOpen(false)}
            >
              <Link
                href="/events"
                className="font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
              >
                <span>Events</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${eventsOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {eventsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {eventsLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200 font-medium"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-200"
          >
            <div className="container-custom py-4 space-y-3">
              {/* Social Media Icons - Mobile */}
              <div className="flex items-center justify-center gap-4 pb-4 border-b border-gray-200">
                <a
                  href="https://www.instagram.com/changerfusions?igsh=bzk0dWM0ZzJsbGxt&utm_source=ig_contact_invite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center transition-colors duration-200"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5 text-white" />
                </a>
                <a
                  href="https://www.facebook.com/share/187Kse9GrQ/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center transition-colors duration-200"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="w-5 h-5 text-white" />
                </a>
                <a
                  href="https://www.linkedin.com/in/changer-fusions-2262a53a3?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center transition-colors duration-200"
                  aria-label="Follow us on LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-white" />
                </a>
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
              
              {/* About Section in Mobile */}
              <div className="pt-2">
                <button
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="flex items-center justify-between w-full py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                >
                  <span>About</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {aboutOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-2 mt-2"
                    >
                      {aboutLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setIsOpen(false);
                            setAboutOpen(false);
                          }}
                          className="block py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Services Section in Mobile */}
              <div className="pt-2">
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="flex items-center justify-between w-full py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                >
                  <span>Services</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {servicesOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-2 mt-2"
                    >
                      {servicesLinks.map((service) => (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => {
                            setIsOpen(false);
                            setServicesOpen(false);
                          }}
                          className="block py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm"
                        >
                          {service.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Careers Section in Mobile */}
              <div className="pt-2">
                <button
                  onClick={() => setCareersMobileOpen(!careersMobileOpen)}
                  className="flex items-center justify-between w-full py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                >
                  <span>Careers</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${careersMobileOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {careersMobileOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-2 mt-2"
                    >
                      {/* Attachments */}
                      <div>
                        <button
                          onClick={() => setCareersMobileSubmenuOpen(careersMobileSubmenuOpen === 'attachments' ? null : 'attachments')}
                          className="flex items-center justify-between w-full py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm font-medium"
                        >
                          <span>Attachments</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${careersMobileSubmenuOpen === 'attachments' ? 'rotate-180' : ''}`} />
                        </button>
                        {careersMobileSubmenuOpen === 'attachments' && (
                          <div className="pl-4 space-y-1 mt-1">
                            {careersLinks.attachments.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsOpen(false);
                                  setCareersMobileOpen(false);
                                  setCareersMobileSubmenuOpen(null);
                                }}
                                className="block py-1.5 text-gray-500 hover:text-primary-600 transition-colors duration-200 text-xs"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Internships */}
                      <div>
                        <button
                          onClick={() => setCareersMobileSubmenuOpen(careersMobileSubmenuOpen === 'internships' ? null : 'internships')}
                          className="flex items-center justify-between w-full py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm font-medium"
                        >
                          <span>Internships</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${careersMobileSubmenuOpen === 'internships' ? 'rotate-180' : ''}`} />
                        </button>
                        {careersMobileSubmenuOpen === 'internships' && (
                          <div className="pl-4 space-y-1 mt-1">
                            {careersLinks.internships.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsOpen(false);
                                  setCareersMobileOpen(false);
                                  setCareersMobileSubmenuOpen(null);
                                }}
                                className="block py-1.5 text-gray-500 hover:text-primary-600 transition-colors duration-200 text-xs"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Jobs */}
                      <div>
                        <button
                          onClick={() => setCareersMobileSubmenuOpen(careersMobileSubmenuOpen === 'jobs' ? null : 'jobs')}
                          className="flex items-center justify-between w-full py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm font-medium"
                        >
                          <span>Jobs</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${careersMobileSubmenuOpen === 'jobs' ? 'rotate-180' : ''}`} />
                        </button>
                        {careersMobileSubmenuOpen === 'jobs' && (
                          <div className="pl-4 space-y-1 mt-1">
                            {careersLinks.jobs.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsOpen(false);
                                  setCareersMobileOpen(false);
                                  setCareersMobileSubmenuOpen(null);
                                }}
                                className="block py-1.5 text-gray-500 hover:text-primary-600 transition-colors duration-200 text-xs"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Events Section in Mobile */}
              <div className="pt-2">
                <button
                  onClick={() => setEventsOpen(!eventsOpen)}
                  className="flex items-center justify-between w-full py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-5 h-5" />
                    <span>Events</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${eventsOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {eventsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-2 mt-2"
                    >
                      {eventsLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setIsOpen(false);
                            setEventsOpen(false);
                          }}
                          className="block py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Link
                  href="/marketing-fusion"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors"
                >
                  Why Changer Fusions
                </Link>
                
                <Link
                  href="/track-application"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold shadow-md"
                >
                  <Search className="w-5 h-5" />
                  <span>Track Application</span>
                </Link>
                
                {/* Testimonials Section in Mobile */}
                <div className="pt-2">
                  <button
                    onClick={() => setTestimonialsOpen(!testimonialsOpen)}
                    className="flex items-center justify-between w-full py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors duration-200"
                  >
                    <span>Testimonials</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${testimonialsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {testimonialsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4 space-y-2 mt-2"
                      >
                        {testimonialsLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setIsOpen(false);
                              setTestimonialsOpen(false);
                            }}
                            className="block py-2 text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Shopping Cart</span>
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/application"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>My Application</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 transition-colors w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold w-full justify-center"
                  >
                    <User className="w-5 h-5" />
                    <span>Login / Sign Up</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}


