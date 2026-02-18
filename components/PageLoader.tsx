"use client";

import ProgressBar from "./ProgressBar";

/**
 * PageLoader: shows content immediately for faster perceived load.
 * ProgressBar displays a thin top bar on route changes only (no blocking overlay).
 */
export default function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProgressBar />
      {children}
    </>
  );
}

