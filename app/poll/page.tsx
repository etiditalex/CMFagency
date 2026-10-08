import type { Metadata } from "next";
import PollHero from "@/components/poll/PollHero";
import PollCtaSection from "@/components/poll/PollCtaSection";
import PollFeaturesSection from "@/components/poll/PollFeaturesSection";
import PollMakerSection from "@/components/poll/PollMakerSection";

export const metadata: Metadata = {
  title: "Poll",
  description:
    "Poll and opinion polls from Changer Fusions. Ask your audience who should take the runway, or what clients and fans think about a brand or event, and get answers in no time.",
};

export default function PollPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-primary-950">
      <PollHero />
      <PollMakerSection />
      <PollFeaturesSection />
      <PollCtaSection />
    </main>
  );
}
