import type { Metadata } from "next";
import IdealMrMissRegistration from "@/components/events/IdealMrMissRegistration";
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

export default function EventRegistrationPage() {
  return <IdealMrMissRegistration />;
}
