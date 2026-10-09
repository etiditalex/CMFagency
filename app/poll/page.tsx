import type { Metadata } from "next";
import PollHero from "@/components/poll/PollHero";
import PollCtaSection from "@/components/poll/PollCtaSection";
import PollFeaturesSection from "@/components/poll/PollFeaturesSection";
import PollJsonLd from "@/components/poll/PollJsonLd";
import PollMakerSection from "@/components/poll/PollMakerSection";
import { pollLandingJsonLd } from "@/lib/poll/poll-jsonld";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const metadata: Metadata = pollPageMetadata({
  title: "Create a Poll in Seconds",
  description:
    "A Changer Fusions poll asks an audience who should take the runway or which session to run next, then shows the tally as people vote. Creating a poll and voting are free.",
  path: "/poll",
  keywords: [
    "create a poll",
    "free online poll",
    "audience poll Kenya",
    "Changer Fusions poll",
    "live poll results",
    "event poll",
    "runway poll",
  ],
});

export default function PollPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-primary-950">
      <PollJsonLd data={pollLandingJsonLd()} />
      <PollHero />
      <PollMakerSection />
      <PollFeaturesSection />
      <PollCtaSection />
    </main>
  );
}
