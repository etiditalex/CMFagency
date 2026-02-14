"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect /pay/[slug] to /[slug] for backwards compatibility.
 * Campaign links no longer include "pay" in the path.
 */
export default function PayRedirectPage() {
  const router = useRouter();
  const params = useParams<{ slug?: string | string[] }>();
  const searchParams = useSearchParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] ?? "" : String(params?.slug ?? "");
  const ref = searchParams?.get("ref");
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";

  useEffect(() => {
    if (slug) router.replace(`/${slug}${query}`);
  }, [router, slug, query]);

  return (
    <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
