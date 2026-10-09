import type { Metadata } from "next";
import PollingFxPollList from "@/components/dashboard/PollingFxPollList";

export const metadata: Metadata = {
  title: "Poll",
};

export default function PollingFxPollPage() {
  return <PollingFxPollList />;
}
