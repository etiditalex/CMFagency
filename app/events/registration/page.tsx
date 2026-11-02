import type { Metadata } from "next";
import IdealMrMissRegistration from "@/components/events/IdealMrMissRegistration";
import { getStarterFormContent } from "@/lib/forms-server";
import { starterDefaultContent } from "@/lib/fusion-forms";
import { getIdealApplicationFeeKes } from "@/lib/ideal-mr-miss-fee";
import { formatIdealFeeKes } from "@/lib/ideal-mr-miss";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const fee = formatIdealFeeKes(await getIdealApplicationFeeKes());
  return {
    title: "Registration",
    description: `Apply for Kenya’s Ideal Mr & Miss 2026. Theme: Models for Education. 12 December 2026 at Malaika Lounge, Malindi. Registration fee ${fee}.`,
  };
}

export default async function EventRegistrationPage() {
  const stored = await getStarterFormContent("registration");
  const content = stored ?? starterDefaultContent("registration");
  return <IdealMrMissRegistration content={content} />;
}
