"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ProgressBarProps {
  onComplete?: () => void;
}

export default function ProgressBar({ onComplete }: ProgressBarProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Only show full loading screen on initial page load
    if (isInitialLoad) {
      setLoading(true);
      setProgress(0);

      // Simulate progress with realistic timing (slower)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          // Slower increments for a more gradual effect
          const increment = prev < 30 ? 8 : prev < 60 ? 5 : prev < 85 ? 3 : 1.5;
          return Math.min(prev + increment, 95);
        });
      }, 150);

      // Complete loading when page is ready
      const handleComplete = () => {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setIsInitialLoad(false);
          if (onComplete) {
            onComplete();
          }
        }, 400);
      };

      // Check if page is already loaded
      if (document.readyState === "complete") {
        const timer = setTimeout(handleComplete, 300);
        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }

      // Listen for page load
      window.addEventListener("load", handleComplete);

      // Fallback timer to ensure it completes (longer duration for slower effect)
      const timer = setTimeout(handleComplete, 3500);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
        window.removeEventListener("load", handleComplete);
      };
    } else {
      // On route changes, show a quick progress bar at the top
      setLoading(true);
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          const increment = prev < 50 ? 15 : prev < 80 ? 8 : 3;
          return Math.min(prev + increment, 90);
        });
      }, 100);

      const timer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
        }, 200);
      }, 500);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [pathname, isInitialLoad, onComplete]);

  // Full screen loading overlay for initial load
  if (isInitialLoad && loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
      >
        {/* Progress Bar Container */}
        <div className="w-full max-w-md px-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600 shadow-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              style={{
                boxShadow: "0 0 10px rgba(59, 121, 218, 0.5), 0 0 20px rgba(44, 165, 124, 0.3)",
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">
              {progress < 100 ? `Loading... ${Math.round(progress)}%` : "Almost there..."}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Top progress bar for route changes
  return (
    <AnimatePresence>
      {loading && !isInitialLoad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600 shadow-lg"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            style={{
              boxShadow: "0 0 10px rgba(59, 121, 218, 0.5), 0 0 20px rgba(44, 165, 124, 0.3)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

