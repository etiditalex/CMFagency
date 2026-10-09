import type { Metadata } from "next";
import CreatePollFaq from "@/components/poll/CreatePollFaq";
import CreatePollForm from "@/components/poll/CreatePollForm";
import CreatePollLiveResults from "@/components/poll/CreatePollLiveResults";
import CreatePollReady from "@/components/poll/CreatePollReady";
import CreatePollShowcase from "@/components/poll/CreatePollShowcase";
import CreatePollSteps from "@/components/poll/CreatePollSteps";
import PollJsonLd from "@/components/poll/PollJsonLd";
import { createPollJsonLd } from "@/lib/poll/poll-jsonld";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const metadata: Metadata = pollPageMetadata({
  title: "Create a Free Poll",
  description:
    "Create a free Changer Fusions poll in three steps: add a question and at least two answers, share the link, and watch the votes update on the public results page. No account is required to vote.",
  path: "/poll/create",
  keywords: [
    "create a free poll",
    "online poll maker",
    "poll maker Kenya",
    "share a poll link",
    "live poll tally",
    "Changer Fusions poll maker",
  ],
});

export default function CreatePollPage() {
  return (
    <main className="poll-create min-h-screen overflow-x-clip bg-primary-950 px-4 pt-[var(--site-nav-height)]">
      <PollJsonLd data={createPollJsonLd()} />
      <CreatePollForm />
      <CreatePollSteps />
      <CreatePollShowcase />
      <CreatePollLiveResults />
      <CreatePollFaq />
      <CreatePollReady />
    </main>
  );
}
