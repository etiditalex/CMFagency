"use client";

import { useEffect, useState } from "react";

export type ManagedPublicPage = {
  route: string;
  section: "services" | "careers";
  title: string;
  hero_label: string;
  description: string;
  background_image_url?: string | null;
  features_title: string;
  features: unknown[];
  benefits_title: string;
  benefits: unknown[];
  cta_title: string;
  cta_description: string;
};

export function useManagedPublicPage(route: string) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<ManagedPublicPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPage(null);
      try {
        const res = await fetch(`/api/pages/public/get?route=${encodeURIComponent(route)}`);
        const json = (await res.json().catch(() => ({}))) as { page?: ManagedPublicPage | null; error?: string };
        if (!res.ok) {
          setError(json.error ?? `Failed to fetch managed page (HTTP ${res.status})`);
          return;
        }
        if (!cancelled) setPage(json.page ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to fetch managed page");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [route]);

  return { loading, page, error };
}

