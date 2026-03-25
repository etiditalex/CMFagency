"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Thin top progress bar on route changes. No blocking overlay - content loads immediately.
 */
export default function ProgressBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return 92;
        }
        const increment = prev < 55 ? 28 : prev < 85 ? 12 : 5;
        return Math.min(prev + increment, 92);
      });
    }, 45);

    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 100);
    }, 220);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent pointer-events-none"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

