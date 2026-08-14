import { getCampaignPageData } from "@/lib/campaign-page-data";
import { GENERIC_CAMPAIGN_LOAD_FAILURE } from "@/lib/payment-user-message";

import CampaignPageClient from "./CampaignPageClient";

/** Ticket campaigns can be briefly cached; vote pages call noStore() in getCampaignPageData. */
export const revalidate = 30;

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
