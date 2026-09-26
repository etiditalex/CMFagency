import type { Metadata } from "next";
import IdealMrMissRegistration from "@/components/events/IdealMrMissRegistration";

export const metadata: Metadata = {
  title: "Registration",
  description:
    "Apply for Kenya’s Ideal Mr & Miss 2026. Theme: Models for Education. 12 December 2026 at Malaika Lounge, Malindi. Registration fee KES 500.",
};

export default function EventRegistrationPage() {
  return <IdealMrMissRegistration />;
}
