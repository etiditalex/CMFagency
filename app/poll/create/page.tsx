import type { Metadata } from "next";
import CreatePollFaq from "@/components/poll/CreatePollFaq";
import CreatePollForm from "@/components/poll/CreatePollForm";
import CreatePollLiveResults from "@/components/poll/CreatePollLiveResults";
import CreatePollReady from "@/components/poll/CreatePollReady";
import CreatePollShowcase from "@/components/poll/CreatePollShowcase";
import CreatePollSteps from "@/components/poll/CreatePollSteps";

export const metadata: Metadata = {
  title: "Create a Poll",
  description: "Create a Changer Fusions poll for an audience, a brand, an event, or a campaign. It publishes live so people can vote.",
};

export default function CreatePollPage() {
  return (
    <main className="poll-create min-h-screen bg-primary-950 px-4 pt-[var(--site-nav-height)]">
      <CreatePollForm />
      <CreatePollSteps />
      <CreatePollShowcase />
      <CreatePollLiveResults />
      <CreatePollFaq />
      <CreatePollReady />
    </main>
  );
}
