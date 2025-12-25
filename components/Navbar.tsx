"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Calendar, ShoppingCart, User, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { getTotalItems } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/testimonials", label: "Testimonials" },
    { href: "/portfolios", label: "Gallery" },
    { href: "/merchandise", label: "Merchandise" },
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
          </div>

          {/* Right Section - Utility Icons and Events Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/marketing-fusion"
              className="font-bold text-gray-900 text-sm hover:text-primary-600 transition-colors"
            >
              Why Changer Fusions
            </Link>
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
            <Link
              href="/profile"
              className="p-2 text-gray-900 hover:text-primary-600 transition-colors"
              aria-label="User Profile"
            >
              <User className="w-5 h-5" />
            </Link>
            <Link
              href="/events"
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 border border-primary-700 rounded-lg text-white font-bold hover:bg-primary-700 transition-colors"
            >
              <Ticket className="w-5 h-5" />
              <span>Events</span>
            </Link>
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
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Link
                  href="/marketing-fusion"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-gray-700 hover:text-primary-600 font-bold transition-colors"
                >
                  Why Changer Fusions
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Shopping Cart</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 border border-primary-700 rounded-lg text-white font-bold hover:bg-primary-700 transition-colors"
                >
                  <Ticket className="w-5 h-5" />
                  <span>Events</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}


