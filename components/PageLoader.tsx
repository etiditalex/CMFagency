"use client";

import { useEffect, useState } from "react";
import ProgressBar from "./ProgressBar";

export default function PageLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      <ProgressBar onComplete={handleLoadingComplete} />
      {!isLoading && children}
    </>
  );
}

