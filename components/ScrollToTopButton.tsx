"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const SHOW_AFTER_SCROLL_PX = 320;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_SCROLL_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Back to top"
      className="fixed right-4 sm:right-6 bottom-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200/90 bg-white text-primary-600 shadow-lg transition hover:bg-gray-50 hover:text-primary-700 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <ChevronUp className="h-6 w-6" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
