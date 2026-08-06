import { getCampaignPageData } from "@/lib/campaign-page-data";
import { GENERIC_CAMPAIGN_LOAD_FAILURE } from "@/lib/payment-user-message";

import CampaignPageClient from "./CampaignPageClient";

/** Tallies and campaign windows are request-time state; never prerender them at build. */
export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const result = await getCampaignPageData(slug);

  return (
    <CampaignPageClient
      key={slug}
      slug={slug}
      initialData={result.ok ? result.data : null}
      initialError={result.ok ? null : GENERIC_CAMPAIGN_LOAD_FAILURE}
      serverNowMs={Date.now()}
    />
  );
}
