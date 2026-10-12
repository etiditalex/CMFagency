import type { Metadata } from "next";
import PollResultsDashboard from "@/components/dashboard/PollResultsDashboard";

export const metadata: Metadata = {
  title: "Poll Results",
};

export default function PollResultsPage() {
  return <PollResultsDashboard />;
}
