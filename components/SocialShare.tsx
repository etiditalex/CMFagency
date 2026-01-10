"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Facebook, Twitter, Linkedin, Share2, Link as LinkIcon, Mail } from "lucide-react";

export default function SocialShare() {
  const pathname = usePathname();
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      setCurrentTitle(document.title);
    }
  }, []);

  // Hide social share on home page, job board pages, login page, application page, and past events pages
  if (pathname === "/" || pathname?.startsWith("/jobs") || pathname === "/login" || pathname === "/application" || pathname?.startsWith("/events/past")) {
    return null;
  }

  const shareText = encodeURIComponent(
    `Check out ${currentTitle} on Changer Fusions - Market to Thrive, Market to Exist`
  );

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${shareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(currentTitle + " " + currentUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(currentTitle)}&body=${encodeURIComponent(currentUrl)}`,
  };

  const handleShare = (platform: string) => {
    const url = shareLinks[platform as keyof typeof shareLinks];
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      alert("Link copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copied to clipboard!");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTitle,
          text: shareText,
          url: currentUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-primary-50 to-secondary-50 py-12"
    >
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Share This Page
            </h3>
            <p className="text-gray-600">
              Help us spread the word! Share this page with your network.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Facebook */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare("facebook")}
              className="flex items-center gap-2 px-6 py-3 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5] transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
              <span className="hidden sm:inline">Facebook</span>
            </motion.button>

            {/* Twitter */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare("twitter")}
              className="flex items-center gap-2 px-6 py-3 bg-[#1DA1F2] text-white rounded-lg font-semibold hover:bg-[#1A91DA] transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
              <span className="hidden sm:inline">Twitter</span>
            </motion.button>

            {/* LinkedIn */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare("linkedin")}
              className="flex items-center gap-2 px-6 py-3 bg-[#0077B5] text-white rounded-lg font-semibold hover:bg-[#006399] transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
              <span className="hidden sm:inline">LinkedIn</span>
            </motion.button>

            {/* WhatsApp */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare("whatsapp")}
              className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-lg font-semibold hover:bg-[#20BA5A] transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Share on WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 10.09c0 1.76.413 3.421 1.15 4.888L.06 24l9.218-2.41a11.88 11.88 0 005.79 1.51h.005c5.554 0 10.089-4.534 10.089-10.09 0-2.704-1.048-5.247-2.951-7.15"/>
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </motion.button>

            {/* Email */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare("email")}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Share via Email"
            >
              <Mail className="w-5 h-5" />
              <span className="hidden sm:inline">Email</span>
            </motion.button>

            {/* Copy Link */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              aria-label="Copy Link"
            >
              <LinkIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Copy Link</span>
            </motion.button>

            {/* Native Share (Mobile) */}
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-6 py-3 bg-secondary-600 text-white rounded-lg font-semibold hover:bg-secondary-700 transition-colors duration-200 shadow-md hover:shadow-lg sm:hidden"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

