"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Calendar, ShoppingCart, User, Ticket, ChevronDown, LogIn, LogOut, FileText } from "lucide-react";
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { getTotalItems } = useCart();
  const { user, login, register, logout, isAuthenticated } = useAuth();

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
      <div className="container-custom">
        <div className="flex items-center justify-between h-[90px]">
          {/* Left Section - Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="relative w-48 h-[90px] md:w-56 lg:w-64">
              <Image
                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"
                alt="Changer Fusions Logo"
                fill
                className="object-contain"
                priority
                fetchPriority="high"
                sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 256px"
              />
            </div>
          </Link>

          {/* Center Section - Navigation Links */}
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
          </div>

          {/* Right Section - Utility Icons and Events Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/marketing-fusion"
              className="font-bold text-gray-900 text-sm hover:text-primary-600 transition-colors"
            >
              Why Changer Fusions
            </Link>
            
            {/* Testimonials Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setTestimonialsOpen(true)}
              onMouseLeave={() => setTestimonialsOpen(false)}
            >
              <Link
                href="/testimonials"
                className="font-bold text-gray-900 text-sm hover:text-primary-600 transition-colors duration-200 flex items-center space-x-1"
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
            {isAuthenticated ? (
              <div className="relative group">
                <button
                  className="flex items-center space-x-2 px-3 py-2 text-gray-900 hover:text-primary-600 transition-colors"
                  aria-label="User Menu"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">{user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link
                    href="/application"
                    className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    My Application
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>Login</span>
              </Link>
            )}
            
            {/* Events Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setEventsOpen(true)}
              onMouseLeave={() => setEventsOpen(false)}
            >
              <Link
                href="/events"
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 border border-primary-700 rounded-lg text-white font-bold hover:bg-primary-700 transition-colors"
              >
                <Ticket className="w-5 h-5" />
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
                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
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
                    className="flex items-center space-x-2 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors w-full justify-center"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login/Register Modal */}
      <AnimatePresence>
        {(showLoginModal || showRegisterModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => {
              setShowLoginModal(false);
              setShowRegisterModal(false);
              setError("");
              setSuccessMessage("");
              setShowForgotPassword(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {showForgotPassword ? "Reset Password" : isLoginMode ? "Sign In" : "Create Account"}
                </h2>
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowRegisterModal(false);
                    setError("");
                    setSuccessMessage("");
                    setShowForgotPassword(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                  {successMessage}
                </div>
              )}

              {showForgotPassword ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Forgot Password
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter your email address and we'll send you instructions to reset your password.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setError("");
                      setSuccessMessage("");
                      
                      // Check if user exists
                      if (typeof window !== "undefined") {
                        const users = JSON.parse(localStorage.getItem("users") || "[]");
                        const foundUser = users.find((u: any) => u.email === forgotPasswordEmail);
                        
                        if (foundUser) {
                          // In a real app, you would send an email here
                          // For now, we'll just show a success message
                          setSuccessMessage(`Password reset instructions would be sent to ${forgotPasswordEmail}. In production, this would send an email.`);
                          setTimeout(() => {
                            setShowForgotPassword(false);
                            setForgotPasswordEmail("");
                            setSuccessMessage("");
                          }, 3000);
                        } else {
                          setError("No account found with this email address.");
                        }
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full btn-primary"
                    >
                      Send Reset Instructions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail("");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Back to Login
                    </button>
                  </form>
                </div>
              ) : isLoginMode ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    const success = await login(loginEmail, loginPassword);
                    if (success) {
                      setShowLoginModal(false);
                      setLoginEmail("");
                      setLoginPassword("");
                    } else {
                      setError("Invalid email or password");
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setError("");
                          setSuccessMessage("");
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter your password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary"
                  >
                    Sign In
                  </button>
                  <p className="text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginMode(false);
                        setError("");
                        setSuccessMessage("");
                        setShowForgotPassword(false);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Sign Up / Register
                    </button>
                  </p>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    if (registerPassword.length < 6) {
                      setError("Password must be at least 6 characters");
                      return;
                    }
                    const success = await register(registerName, registerEmail, registerPassword);
                    if (success) {
                      setShowRegisterModal(false);
                      setRegisterName("");
                      setRegisterEmail("");
                      setRegisterPassword("");
                    } else {
                      setError("Email already registered");
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary"
                  >
                    Register
                  </button>
                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginMode(true);
                        setError("");
                        setSuccessMessage("");
                        setShowForgotPassword(false);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}


