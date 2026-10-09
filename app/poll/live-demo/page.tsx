import type { Metadata } from "next";
import LiveDemoPanel from "@/components/poll/LiveDemoPanel";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const metadata: Metadata = pollPageMetadata({
  title: "Live poll demo",
  description:
    "Try a Changer Fusions poll on a public page. Choose a runway brand, vote, and watch the tally move. The demo stays on this screen.",
  path: "/poll/live-demo",
  keywords: ["live poll demo", "Changer Fusions poll", "runway poll", "live poll results"],
});

export default function PollLiveDemoPage() {
  return (
    <main className="poll-live-demo flex min-h-screen flex-col items-center justify-center overflow-x-clip bg-primary-950 px-4 pb-16 pt-[var(--site-nav-height)]">
      <LiveDemoPanel />
    </main>
  );
}
